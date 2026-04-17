import logging
import json
from datetime import datetime
from validators.tool.web3 import Web3Tool
from validators.contract.stvault.service.create import CreateVaultService
from validators.contract.stvault.service.pdg import PDGContractService
from validators.contract.stvault.service.dashboard import DashboardContractService
from validators.contract.stvault.service.stvault import StvaultService
from validators.contract.stvault.service.stvault_cli_api import StvaultCliApiService
from validators.contract.stvault.service.vault import VaultContractService
from validators.contract.stvault.service.steth import STETHContractService, STTokenType
from validators.contract.stvault.service.lazyoracle import LazyOracleContractService
from validators.contract.stvault import config as stvault_config
from apis.views.base import BaseApiView, REQUEST_TYPE, InternalApiView
from validators.models import StVault
from validators.models.statistics import Statistics



logger = logging.getLogger(__name__)



class StVaultCreateApiView(BaseApiView):
    def post(self, request, *args, **kwargs):
        """
        创建StVault
        :param from_address: 发起者地址
        :param address: StVault地址
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['from_address'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        if not Web3Tool.is_address(from_address):
            return self.error_response(request, 400, 'invalid_params', ['from_address'])
        from_address = Web3Tool.check_address(from_address)
        vault_owner = from_address

        # 检查是否暂停创建
        if stvault_config.get_is_paused():
            return self.error_response(request, 403, 'stvault_creation_paused')

        # 创建StVault
        tx = CreateVaultService.create_vault_with_dashboard(from_address, vault_owner)
        return self.success_response(request, tx)

class StVaultCreateHashApiView(BaseApiView):
    def post(self, request, *args, **kwargs):
        """
        创建StVault
        :param tx_hash: 交易哈希
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['tx_hash'])
        if not is_valid:
            return items

        # 检查是否暂停创建
        if stvault_config.get_is_paused():
            return self.error_response(request, 403, 'stvault_creation_paused')

        tx_hash = items.get('tx_hash')
        stvault = StVault.objects.filter(create_hash=tx_hash).first()
        if not stvault:
            stvault = StVault.objects.create(create_hash=tx_hash, status=StVault.VaultStatus.PENDING.value)
        return self.success_response(request, {'tx_hash': tx_hash})

class StVaultListApiView(BaseApiView):
    def get(self, request, *args, **kwargs):
        """
        获取StVault列表
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['vault_owner'], request_type=REQUEST_TYPE.GET)
        if not is_valid:
            return items

        vault_owner = Web3Tool.check_address(items.get('vault_owner'))
        # 获取列表数据
        stvaults_data = StVault.get_list_queryset(vault_owner)
        # 转换 Decimal 字段为字符串
        if len(stvaults_data) > 0:
            decimal_fields = StVault.decimal_fields()
            stvaults_data = self.convert_decimal_fields_to_str(stvaults_data, decimal_fields)
        result = {
            'vaults': stvaults_data
        }
        return self.success_response(request, result)


class StVaultDashboardListApiView(BaseApiView):
    def get(self, request, *args, **kwargs):
        """
        获取StVault列表
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['vault_owner'], request_type=REQUEST_TYPE.GET)
        if not is_valid:
            return items

        vault_owner = Web3Tool.check_address(items.get('vault_owner'))
        # 获取详情数据（已经是字典列表）
        stvaults_data = StVault.get_dashboard_queryset(vault_owner)

        # 转换 Decimal 字段为字符串
        if len(stvaults_data) > 0:
            decimal_fields = StVault.decimal_fields()
            stvaults_data = self.convert_decimal_fields_to_str(stvaults_data, decimal_fields)

        result = {
            'vaults': stvaults_data
        }
        return self.success_response(request, result)


class DashboardSupplyApiView(BaseApiView):
    def post(self, request, *args, **kwargs):
        """
        存款到Dashboard（fund）
        :param from_address: 发起者地址
        :param contract_address: Dashboard 合约地址
        :param amount: 存款金额
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'vault', 'amount'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        vault = Web3Tool.check_address(items.get('vault'))
        amount = items.get('amount')

        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')

        # 校验 amount 必须大于0
        value_wei = Web3Tool.to_wei(amount, "ether")
        if value_wei <= 0:
            return self.error_response(request, 400, 'invalid_params', ['amount'])

        # 交易列表
        tx = []
        fund_tx = DashboardContractService.fund(from_address, stvault.dashboard, value_wei)
        if fund_tx:
            tx.append(fund_tx)
        return self.success_response(request, tx)


class DashboardWithdrawApiView(BaseApiView):
    def post(self, request, *args, **kwargs):
        """
        提现（withdraw）
        :param from_address: 发起者地址
        :param vault: vault 合约地址
        :param amount: 提现金额
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'vault', 'amount'])
        if not is_valid:
            return items
        from_address = items.get('from_address')
        vault = Web3Tool.check_address(items.get('vault'))
        amount = items.get('amount')
        recipient = Web3Tool.check_address(from_address)

        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')
        dashboard = Web3Tool.check_address(stvault.dashboard)

        # 校验 amount 必须大于0
        amount_wei = Web3Tool.to_wei(amount, "ether")
        if amount_wei <= 0:
            return self.error_response(request, 400, 'invalid_params', ['amount'])

        # 交易列表
        tx = []
        is_success, report_tx, error_msg = StvaultService.get_update_report_data(vault)
        if not is_success:
            return self.error_response(request, 500, 'system_error')
        if report_tx:
            tx.append(report_tx)
        withdraw_tx = DashboardContractService.withdraw(from_address, dashboard, recipient, amount_wei)
        if withdraw_tx:
            tx.append(withdraw_tx)
        return self.success_response(request, tx)


class DashboardMintstETHApiView(BaseApiView):
    def post(self, request, *args, **kwargs):
        """
        铸造 stETH（mintStETH）
        :param from_address: 发起者地址
        :param vault: vault 合约地址
        :param amount: 铸造金额
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'vault', 'amount'])
        if not is_valid:
            return items

        from_address = Web3Tool.check_address(items.get('from_address'))
        vault = Web3Tool.check_address(items.get('vault'))
        amount = items.get('amount')
        recipient = Web3Tool.check_address(from_address)

        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')
        dashboard = Web3Tool.check_address(stvault.dashboard)
        # 校验 amount 必须大于0
        amount_wei = Web3Tool.to_wei(amount, "ether")
        if amount_wei <= 0:
            return self.error_response(request, 400, 'invalid_params', ['amount'])
        amount_shares = STETHContractService.get_shares_by_pooled_eth(amount_wei)
        is_enough = StvaultService.check_remaining_minting_capacity_shares(dashboard, amount_shares)
        if not is_enough:
            return self.error_response(request, 400, 'invalid_params')

        # 交易列表
        tx = []
        is_success, report_tx, error_msg = StvaultService.get_update_report_data(vault)
        if not is_success:
            return self.error_response(request, 500, 'system_error')
        if report_tx:
            tx.append(report_tx)
        mint_tx = DashboardContractService.mint_steth(from_address, dashboard, recipient, amount_shares)
        tx.append(mint_tx)
        return self.success_response(request, tx)

class DashboardRepaystETHApiView(BaseApiView):
    def post(self, request, *args, **kwargs):
        """
        还款 stETH（repayStETH）
        :param from_address: 发起者地址
        :param vault: vault 合约地址
        :param amount: 还款金额
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'vault', 'amount'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        vault = Web3Tool.check_address(items.get('vault'))
        amount_steth = items.get('amount')
        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')
        dashboard = Web3Tool.check_address(stvault.dashboard)
        # 校验 amount 必须大于0
        amount_steth_wei = Web3Tool.to_wei(amount_steth, "ether")
        if amount_steth_wei <= 0:
            return self.error_response(request, 400, 'invalid_params', ['amount'])

        amount_shares = STETHContractService.get_shares_by_pooled_eth(amount_steth_wei)
        is_enough = StvaultService.check_liability_shares(dashboard, amount_shares)
        if not is_enough:
            return self.error_response(request, 400, 'invalid_params', ['amount must be less than liability shares'])


        # 交易列表
        tx = []
        is_success, report_tx, error_msg = StvaultService.get_update_report_data(vault)
        if not is_success:
            return self.error_response(request, 500, 'system_error')
        if report_tx:
            tx.append(report_tx)
        approve_info = STETHContractService.checkAllowance(from_address, dashboard, amount_shares, STTokenType.SHARES)
        if approve_info["need_approve"]:
            tx.append(approve_info["approve_tx"])
        burn_tx = DashboardContractService.burn_shares(from_address, dashboard, amount_shares)
        tx.append(burn_tx)
        return self.success_response(request, tx)




class StVaultInfoRefreshApiView(BaseApiView):
    def get(self, request, *args, **kwargs):
        """
        获取StVault详情
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['vault'], request_type=REQUEST_TYPE.GET)
        if not is_valid:
            return items

        vault = items.get('vault')
        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')
        # 更新valut数据
        result = StvaultService.refresh_stvault(vault)
        if result == False:
            return self.error_response(request, 500, 'system_error')
        # 查询vault信息
        stvault = StVault.get_dashboard_vault(vault)
        # 转换 Decimal 字段为字符串
        decimal_fields = StVault.decimal_fields()
        stvault = self.convert_decimal_fields_to_str(stvault, decimal_fields)
        return self.success_response(request, stvault)



class StVaultRefreshBalanceApiView(BaseApiView):
    def get(self, request, *args, **kwargs):
        """
        刷新StVault余额
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['vault'], request_type=REQUEST_TYPE.GET)
        if not is_valid:
            return items
        vault = items.get('vault')

        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')
        dashboard = Web3Tool.check_address(stvault.dashboard)

        # 更新valut数据
        balance = Web3Tool.get_balance_wei(vault)
        total_value = DashboardContractService.get_total_value(dashboard)
        withdrawable_value = DashboardContractService.get_withdrawable_value(dashboard)
        # 检查是否都获取成功
        if balance is None or total_value is None or withdrawable_value is None:
            return self.error_response(request, 500, 'system_error')
        format_result = {
            'balance': str(balance),
            'total_value': str(total_value),
            'withdrawable_value': str(withdrawable_value),
        }
        StvaultService.update_stvault_info(vault, format_result)

        return self.success_response(request, format_result)


class StVaultRefreshMintBalanceApiView(BaseApiView):
    def get(self, request, *args, **kwargs):
        """
        刷新StVault余额
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['vault'], request_type=REQUEST_TYPE.GET)
        if not is_valid:
            return items

        vault = items.get('vault')
        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')
        dashboard = Web3Tool.check_address(stvault.dashboard)

        # 更新valut数据
        liability_shares = DashboardContractService.get_liability_shares(dashboard)
        liability_steth = STETHContractService.get_pooled_eth_by_shares(liability_shares)
        remaining_minting_capacity_shares = DashboardContractService.get_remaining_minting_capacity_shares(dashboard)
        remaining_minting_capacity_steth = STETHContractService.get_pooled_eth_by_shares(remaining_minting_capacity_shares)
        if liability_steth is None or remaining_minting_capacity_steth is None:
            return self.error_response(request, 500, 'system_error')
        format_result = {
            'liability_steth': str(liability_steth),
            'remaining_minting_capacity_steth': str(remaining_minting_capacity_steth),
        }
        StvaultService.update_stvault_info(vault, format_result)

        return self.success_response(request, format_result)



# class DashboardSetPDGPolicyApiView(BaseApiView):
#     def post(self, request, *args, **kwargs):
#         """
#         设置 PDG 策略（setPDGPolicy）
#         :param from_address: 发起者地址
#         :param contract_address: Dashboard 合约地址
#         :param pdg_policy: PDG 策略值（uint8，枚举类型）
#         """
#         #登录验证
#         is_valid, items = self.verify_auth(request)
#         if not is_valid:
#             return items

#         #参数验证
#         is_valid, items = self.validate_params(request, ['from_address', 'dashboard', 'pdg_policy'])
#         if not is_valid:
#             return items

#         from_address = items.get('from_address')
#         dashboard = items.get('dashboard')
#         pdg_policy = items.get('pdg_policy')

#         # 校验 pdg_policy 必须为 0-255 之间的整数（uint8）
#         try:
#             pdg_policy_int = int(pdg_policy)
#             if pdg_policy_int < 0 or pdg_policy_int > 255:
#                 raise ValueError('pdg_policy must be between 0 and 255')
#         except (ValueError, TypeError):
#             return self.error_response(request, 400, 'invalid_params', ['pdg_policy must be a valid uint8 (0-255)'])

#         tx = DashboardContractService.set_pdg_policy(from_address, dashboard, pdg_policy_int)
#         return self.success_response(request, tx)


# class DashboardUnguaranteedApiView(BaseApiView):
#     def post(self, request, *args, **kwargs):
#         """
#         无保证存款到信标链（unguaranteedDepositToBeaconChain）
#         :param from_address: 发起者地址
#         :param contract_address: Dashboard 合约地址
#         :param deposits: 存款列表 [{pubkey, signature, amount, deposit_data_root}]
#         """
#         #登录验证
#         is_valid, items = self.verify_auth(request)
#         if not is_valid:
#             return items

#         #参数验证
#         is_valid, items = self.validate_params(request, ['from_address', 'dashboard', 'deposits'])
#         if not is_valid:
#             return items

#         from_address = items.get('from_address')
#         dashboard = items.get('dashboard')
#         deposits_payload = items.get('deposits')

#         if not deposits_payload:
#             return self.error_response(request, 400, 'invalid_params', ['deposits cannot be empty'])

#         # 转换 deposits 为合约需要的格式
#         deposits = []
#         for d in deposits_payload:
#             if not all(k in d for k in ['pubkey', 'signature', 'amount', 'deposit_data_root']):
#                 raise Exception('deposit is invalid')
#             pubkey_bytes = Web3Tool.hex_to_bytes(d['pubkey']) if isinstance(d['pubkey'], str) else d['pubkey']
#             signature_bytes = Web3Tool.hex_to_bytes(d['signature']) if isinstance(d['signature'], str) else d['signature']
#             # amount 如果是字符串形式的 ETH，转换为 wei（但通常存款金额是 Gwei，需要确认）
#             if isinstance(d['amount'], str) and not d['amount'].startswith('0x'):
#                 # 假设是 Gwei 单位（32 ETH = 32000000000 Gwei）
#                 amount_wei = int(float(d['amount']) * 10**9)
#             else:
#                 amount_wei = int(d['amount'])
#             deposit_data_root_bytes = Web3Tool.hex_to_bytes(d['deposit_data_root']) if isinstance(d['deposit_data_root'], str) else d['deposit_data_root']
#             deposits.append([pubkey_bytes, signature_bytes, amount_wei, deposit_data_root_bytes])

#         tx = DashboardContractService.unguaranteed_deposit_to_beacon_chain(from_address, dashboard, deposits)
#         return self.success_response(request, tx)


class DashboardMetricsDataApiView(BaseApiView):
    def get(self, request, *args, **kwargs):
        """
        获取Dashboard Metrics Data
        :param vault: vault 合约地址
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['vault'], request_type=REQUEST_TYPE.GET)
        if not is_valid:
            return items

        vault = Web3Tool.check_address(items.get('vault'))
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')
        dashboard = Web3Tool.check_address(stvault.dashboard)
        latest_report = LazyOracleContractService.get_latest_report_data(vault)
        # 获取metrics数据
        metrics_data = StvaultCliApiService.get_metrics_data(vault, dashboard, latest_report)
        if not metrics_data:
            return self.error_response(request, 400, 'failed_to_fetch_metrics_data')
        return self.success_response(request, metrics_data)


class StVaultStatisticsApiView(BaseApiView):
    """
    获取StVault统计数据，不需要登录权限
    """
    require_auth = False

    def get(self, request, *args, **kwargs):
        """
        获取StVault统计数据
        :param date: 可选，日期格式 YYYY-MM-DD，不传则返回最新数据
        """
        items = request.GET
        date = items.get('date')
        # 如果date不为空，则查询指定日期的统计数据
        if date:
            try:
                query_date = datetime.strptime(date, '%Y-%m-%d').date()
                statistics = Statistics.objects.filter(name='stvault', date=query_date).first()
            except ValueError:
                return self.error_response(request, 400, 'invalid_params')
        else:
            # 获取最新的一条数据
            statistics = Statistics.objects.filter(name='stvault').order_by('-date').first()


        if not statistics:
            return self.success_response(request, {})
        try:
            data = json.loads(statistics.data)
            # 转换为整数（先转float再转int）
            data['total_eth'] = int(float(data['total_eth']))
            data['total_unstaked_eth'] = int(float(data['total_unstaked_eth']))
            return self.success_response(request, data)
        except json.JSONDecodeError:
            return self.error_response(request, 500, 'system_error')






'============== Operator / PDG =============='
#内部服务调用，不对外暴露，不需要登录验证
class BasePDGView(InternalApiView):
    """
    StVault API 基类，继承 BaseApiView 并添加合约状态检查功能
    """
    def check_contract_paused(self, request):
        """
        检查合约是否暂停（主要用于PDG合约）
        :param request: 请求对象
        :return: (is_paused, response) - (是否暂停, 如果暂停则返回错误响应，否则返回None)
        """
        is_paused = PDGContractService.is_paused()
        if is_paused is True:
            return True, self.error_response(request, 600, 'contract_paused')
        return False, None

class PDGGuarantorApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        设置Guarantor
        :param from_address: 发起者地址
        :param guarantor: Guarantor 地址
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'guarantor'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        guarantor = items.get('guarantor')

        is_paused, paused_response = self.check_contract_paused(request)
        if is_paused:
            return paused_response

        tx = PDGContractService.set_guarantor(from_address, guarantor)
        return self.success_response(request, tx)

class PDGDepositorApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        设置 Depositor
        :param from_address: 发起者地址
        :param depositor: 存款地址
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'depositor'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        depositor = items.get('depositor')

        is_paused, paused_response = self.check_contract_paused(request)
        if is_paused:
            return paused_response

        tx = PDGContractService.set_depositor(from_address, depositor)
        return self.success_response(request, tx)

class PDGGuaranteeApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        充值节点运营商余额
        :param from_address: 发起者地址
        :param node_operator: 节点运营商地址
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'node_operator', 'amount'])
        if not is_valid:
            return items

        items = items
        from_address = items.get('from_address')
        node_operator = items.get('node_operator')
        amount = items.get('amount')

        is_paused, paused_response = self.check_contract_paused(request)
        if is_paused:
            return paused_response

        value_wei = Web3Tool.to_wei(amount, "ether")
        tx = PDGContractService.top_up_node_operator_balance(from_address, node_operator, value_wei)
        return self.success_response(request, tx)

class PDGPredepositApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        预存保证金（predeposit）
        :param from_address: 发起者地址
        :param staking_vault: StakingVault 合约地址
        :param deposits: 存款列表 [{pubkey, signature, amount, deposit_data_root}]
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'vault', 'deposits'])
        if not is_valid:
            return items

        items = items
        from_address = items.get('from_address')
        vault = items.get('vault')
        deposits = items.get('deposits')
        if not deposits:
            raise Exception('deposits is empty')

        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')

        # 合约是否暂停
        is_paused, paused_response = self.check_contract_paused(request)
        if is_paused:
            return paused_response

        # 校验deposits
        withdrawal_credentials = VaultContractService.withdrawal_credentials(vault)
        is_valid = StvaultCliApiService.validate_deposits(deposits, withdrawal_credentials)
        if not is_valid:
            return self.error_response(request, 400, 'deposit_invalid')

        # 校验deposits金额是否为predeposit_amount
        predeposit_amount = PDGContractService.predeposit_amount()
        if predeposit_amount is None:
            return self.error_response(request, 500, 'system_error')
        contract_deposits = []
        for deposit in deposits:
            pubkey = Web3Tool.hex_to_bytes(deposit['pubkey']);
            signature = Web3Tool.hex_to_bytes(deposit['signature']);
            amount = int(deposit['amount']) * 10 ** 9;
            if amount != predeposit_amount:
                return self.error_response(request, 400, 'invalid_params', ['amount must be multiple of predeposit_amount'])
            depositDataRoot = Web3Tool.hex_to_bytes(deposit['deposit_data_root']);
            contract_deposits.append([pubkey, signature, amount, depositDataRoot]);


        # 生成depositY
        depositsY = StvaultCliApiService.get_depositY(deposits)
        if not depositsY:
            return self.error_response(request, 500, 'system_error')
        # 将 depositY 转换为 ABI 需要的格式
        # ABI 格式: BLS12_381.DepositY[] = [{pubkeyY: {a, b}, signatureY: {c0_a, c0_b, c1_a, c1_b}}]
        formatted_depositsY = []
        for depositY_item in depositsY:
            pubkeyY = depositY_item.get('pubkeyY')
            signatureY = depositY_item.get('signatureY')

            # 转换 pubkeyY: {a: bytes32, b: bytes32}
            pubkeyY_a = Web3Tool.hex_to_bytes(pubkeyY.get('a'))
            pubkeyY_b = Web3Tool.hex_to_bytes(pubkeyY.get('b'))

            # 转换 signatureY: {c0_a: bytes32, c0_b: bytes32, c1_a: bytes32, c1_b: bytes32}
            sig_c0_a = Web3Tool.hex_to_bytes(signatureY.get('c0_a'))
            sig_c0_b = Web3Tool.hex_to_bytes(signatureY.get('c0_b'))
            sig_c1_a = Web3Tool.hex_to_bytes(signatureY.get('c1_a'))
            sig_c1_b = Web3Tool.hex_to_bytes(signatureY.get('c1_b'))

            # 按照 ABI 结构组织: [{pubkeyY: [a, b]}, {signatureY: [c0_a, c0_b, c1_a, c1_b]}]
            formatted_depositsY.append([
                [pubkeyY_a, pubkeyY_b],  # pubkeyY (Fp)
                [sig_c0_a, sig_c0_b, sig_c1_a, sig_c1_b]  # signatureY (Fp2)
            ])
        depositsY = formatted_depositsY


        tx = PDGContractService.predeposit(from_address, vault, contract_deposits, depositsY)
        return self.success_response(request, tx)

class PDGProveWCAndTopUpApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        证明 WC 激活并充值验证器（proveWCActivateAndTopUpValidators）
        :param from_address: 发起者地址
        :param indexes: 验证器索引列表 [uint256]
        :param amounts: 充值金额列表 [uint256]
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'indexes', 'amounts'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        indexes = items.get('indexes')
        amounts = items.get('amounts')
        if not indexes or not amounts:
            raise Exception('indexes or amounts is empty')
        amounts_wei = [Web3Tool.to_wei(amount, "ether") for amount in amounts]

        # 合约是否暂停
        is_paused, paused_response = self.check_contract_paused(request)
        if is_paused:
            return paused_response

        # 获取witnesses
        witnesses_payload = StvaultCliApiService.get_witnesses(indexes)
        if not witnesses_payload:
            return self.error_response(request, 400, 'system_error')

        # 转换 witnesses 为合约需要的格式
        witnesses = []
        for w in witnesses_payload:
            if not all(k in w for k in ['proof', 'pubkey', 'validatorIndex', 'childBlockTimestamp', 'slot', 'proposerIndex']):
                continue
            witnesses.append([
                w['proof'],
                w['pubkey'],
                # [Web3Tool.hex_to_bytes(p) if isinstance(p, str) else p for p in w['proof']],  # proof: bytes32[]
                # Web3Tool.hex_to_bytes(w['pubkey']) if isinstance(w['pubkey'], str) else w['pubkey'],  # pubkey: bytes
                int(w['validatorIndex']),  # validatorIndex: uint256
                int(w['childBlockTimestamp']),  # childBlockTimestamp: uint64
                int(w['slot']),  # slot: uint64
                int(w['proposerIndex']),  # proposerIndex: uint64
            ])
        # 转换 amounts 为整数列表
        tx = PDGContractService.prove_wc_activate_and_top_up_validators(from_address, witnesses, amounts_wei)
        return self.success_response(request, tx)

class PDGTopUpApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        充值现有验证器（topUpExistingValidators）
        :param from_address: 发起者地址
        :param top_ups: 验证器充值列表 [{pubkey, amount}]
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'topups'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        topups = items.get('topups')
        if not topups:
            raise Exception('topups is empty')

        # 合约是否暂停
        is_paused, paused_response = self.check_contract_paused(request)
        if is_paused:
            return paused_response

        # 转换 top_ups 为合约需要的格式
        top_ups = []
        for topup in topups:
            if not all(k in topup for k in ['pubkey', 'amount']):
                raise Exception('topup is invalid')
            pubkey = Web3Tool.hex_to_bytes(topup['pubkey']) if isinstance(topup['pubkey'], str) else topup['pubkey']
            amount = Web3Tool.to_wei(topup['amount'], "ether")
            top_ups.append([pubkey, amount])

        tx = PDGContractService.top_up_existing_validators(from_address, top_ups)
        return self.success_response(request, tx)

class PDGWithdrawNOBalanceApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        提取节点运营商余额（withdrawNodeOperatorBalance）
        :param from_address: 发起者地址
        :param node_operator: 节点运营商地址
        :param amount: 提取金额（wei）
        :param recipient: 接收者地址
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'node_operator', 'amount', 'recipient'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        node_operator = items.get('node_operator')
        amount = items.get('amount')
        recipient = items.get('recipient')

        # 合约是否暂停
        is_paused, paused_response = self.check_contract_paused(request)
        if is_paused:
            return paused_response

        # 转换 amount 为整数（如果传入的是字符串形式的 ETH，需要转换为 wei）
        amount_wei = Web3Tool.to_wei(amount, "ether")

        tx = PDGContractService.withdraw_node_operator_balance(from_address, node_operator, amount_wei, recipient)
        return self.success_response(request, tx)



class PDGRequestValidatorExitApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        请求验证器退出（requestValidatorExit）
        :param from_address: 发起者地址
        :param vault: StakingVault 合约地址
        :param pubkeys: 验证器公钥列表
        """
        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'vault', 'pubkey'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        vault = Web3Tool.check_address(items.get('vault'))
        pubkey = items.get('pubkey')
        # 查询vault是否存在
        stvault = StVault.objects.filter(vault__iexact=vault).first()
        if not stvault:
            return self.error_response(request, 400, 'stvault_not_exist')
        dashboard = Web3Tool.check_address(stvault.dashboard)
        tx = DashboardContractService.request_validator_exit(from_address, dashboard, pubkey)
        return self.success_response(request, tx)


class PDGProveUnknownValidatorApiView(BasePDGView):
    def post(self, request, *args, **kwargs):
        """
        证明未知验证器（proveUnknownValidator）
        :param from_address: 发起者地址
        :param witness: 验证器见证 {proof, pubkey, validatorIndex, childBlockTimestamp, slot, proposerIndex}
        :param staking_vault: StakingVault 合约地址
        """
        #登录验证
        is_valid, items = self.verify_auth(request)
        if not is_valid:
            return items

        #参数验证
        is_valid, items = self.validate_params(request, ['from_address', 'index', 'staking_vault'], ['from_address', 'witness', 'staking_vault'])
        if not is_valid:
            return items

        from_address = items.get('from_address')
        index = items.get('index')
        staking_vault = items.get('staking_vault')

        # 合约是否暂停
        is_paused, paused_response = self.check_contract_paused(request)
        if is_paused:
            return paused_response

        # 获取witnesses
        witnesses_payload = StvaultCliApiService.get_witnesses([index])
        if not witnesses_payload:
            raise Exception('Failed to fetch witnesses')

        # 转换 witnesses 为合约需要的格式
        witnesses = []
        for w in witnesses_payload:
            if not all(k in w for k in ['proof', 'pubkey', 'validatorIndex', 'childBlockTimestamp', 'slot', 'proposerIndex']):
                continue
            witnesses.append([
                [Web3Tool.hex_to_bytes(p) if isinstance(p, str) else p for p in w['proof']],  # proof: bytes32[]
                Web3Tool.hex_to_bytes(w['pubkey']) if isinstance(w['pubkey'], str) else w['pubkey'],  # pubkey: bytes
                int(w['validatorIndex']),  # validatorIndex: uint256
                int(w['childBlockTimestamp']),  # childBlockTimestamp: uint64
                int(w['slot']),  # slot: uint64
                int(w['proposerIndex']),  # proposerIndex: uint64
            ])
        witness = witnesses[0]
        tx = PDGContractService.prove_unknown_validator(from_address, witness, staking_vault)
        return self.success_response(request, tx)
