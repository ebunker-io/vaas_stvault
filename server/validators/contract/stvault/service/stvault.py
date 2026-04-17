from enum import Enum
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from validators.tool.web3 import Web3Tool
from typing import Optional, Any, Dict
from validators.contract.stvault.service.steth import STETHContractService
from validators.contract.stvault.service.dashboard import DashboardContractService
from validators.contract.stvault.service.operator_grid import OperatorGridContractService
from validators.contract.stvault.service.stvault_cli_api import StvaultCliApiService
from validators.contract.stvault.service.lazyoracle import LazyOracleContractService
from validators.contract.stvault.service.vaulthub import VaultHubContractService
from validators.contract.stvault.util.stvault import StvaultUtil
from validators.models import StVault
from datetime import datetime

logger = logging.getLogger(__name__)

class StvaultService:

    @classmethod
    def refresh_vault_operator_manager(cls, dashboard: str):
        dashboard = Web3Tool.check_address(dashboard)
        operator_manager = DashboardContractService.get_operator_manager(dashboard)
        return operator_manager

    @classmethod
    def refresh_stvault_list(cls, vault_owner: str) -> bool:
        """
        获取StVault列表
        """
        stvaults = StVault.get_list_queryset(vault_owner)
        for vault in stvaults:
            result = cls.refresh_stvault(vault.vault)
            if result == False:
                return False
        return True

    @classmethod
    def refresh_stvault(cls, vault: str) -> Optional[Dict[str, Any]]:
        """
        并发查询所有 Vault 信息，如果有任何查询失败则立即返回 None
        """
        # 将地址转换为 checksum 格式
        vault = Web3Tool.check_address(vault)
        stvault = StVault.objects.filter(vault=vault).first()
        if not stvault:
            return None
        dashboard = Web3Tool.check_address(stvault.dashboard)

        # 定义所有查询任务
        tasks = {
            'balance': lambda: Web3Tool.get_balance_wei(vault),
            'vault_connection': lambda: DashboardContractService.get_vault_connection(dashboard),
            'liability_shares': lambda: DashboardContractService.get_liability_shares(dashboard),
            'total_value': lambda: DashboardContractService.get_total_value(dashboard),
            'locked': lambda: DashboardContractService.get_locked(dashboard),
            # 'max_lockable_value': lambda: DashboardContractService.get_max_lockable_value(dashboard),
            'total_minting_capacity_shares': lambda: DashboardContractService.get_total_minting_capacity_shares(dashboard),
            'remaining_minting_capacity_shares': lambda: DashboardContractService.get_remaining_minting_capacity_shares(dashboard),
            'withdrawable_value': lambda: DashboardContractService.get_withdrawable_value(dashboard),
            # 'settled_growth': lambda: DashboardContractService.get_settled_growth(dashboard),
            'accrued_fee': lambda: DashboardContractService.get_accrued_fee(dashboard),
            'fee_rate': lambda: DashboardContractService.get_fee_rate(dashboard),
            'confirm_expiry': lambda: DashboardContractService.get_confirm_expiry(dashboard),
            # 'obligations': lambda: VaultHubContractService.get_obligations(vault),
            'tier_info': lambda: OperatorGridContractService.get_vault_tier_info(vault),
        }

        # 并发执行所有查询
        results = {}
        with ThreadPoolExecutor(max_workers=15) as executor:
            # 提交所有任务
            future_to_key = {
                executor.submit(task): key
                for key, task in tasks.items()
            }

            # 使用 as_completed 来检查完成情况，如果有失败立即返回
            for future in as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    result = future.result()
                    results[key] = result
                except Exception as e:
                    # 任何查询失败，立即返回 None
                    logger.error(f"Failed to query {key} for dashboard {dashboard}: {e}", exc_info=True)
                    return False

        # shares to steth
        # 优化：使用并发批量转换 shares 到 steth
        shares_to_steth_mapping = {
            'liability_steth': 'liability_shares',
            'total_minting_capacity_steth': 'total_minting_capacity_shares',
            'remaining_minting_capacity_steth': 'remaining_minting_capacity_shares'
        }
        # 并发执行转换
        with ThreadPoolExecutor(max_workers=len(shares_to_steth_mapping)) as executor:
            futures = {
                executor.submit(
                    STETHContractService.get_pooled_eth_by_shares,
                    results[shares_key]
                ): steth_key
                for steth_key, shares_key in shares_to_steth_mapping.items()
            }

            for future in as_completed(futures):
                steth_key = futures[future]
                try:
                    results[steth_key] = future.result()
                except Exception as e:
                    logger.error(f"Failed to convert {steth_key} for vault {vault}: {e}", exc_info=True)
                    return False

        # 计算健康因子
        total_value = results['total_value']
        liability_steth = results['liability_steth']
        forced_rebalance_threshold_bp = results['vault_connection'].get('forced_rebalance_threshold_bp')
        health_info = StvaultUtil.calculate_health(total_value, liability_steth, forced_rebalance_threshold_bp)


        # 返回结果处理
        format_result = {
            'vault': vault,
            'dashboard': dashboard,
            'total_value': results['total_value'],
            'balance': results['balance'],
            'liability_steth': results['liability_steth'],
            'total_minting_capacity_steth': results['total_minting_capacity_steth'],
            'remaining_minting_capacity_steth': results['remaining_minting_capacity_steth'],
            'withdrawable_value': results['withdrawable_value'],
            'locked': results['locked'],
            'infra_fee': StvaultUtil.format_bp(results['vault_connection'].get('infra_fee_bp')),
            'liquidity_fee': StvaultUtil.format_bp(results['vault_connection'].get('liquidity_fee_bp')),
            'operator_fee_rate': StvaultUtil.format_bp(results['fee_rate']),
            'undisbursed_operator_fee': results['accrued_fee'],
            'confirm_expiry': results['confirm_expiry'],
            'health_factor': health_info.get('health_ratio'),
            'tier_id': results['tier_info'].get('tier_id'),
            'refresh_all_data_time': datetime.now(),
        }

        # 获取apr
        metrics_data = cls.get_vault_metrics(vault, dashboard)
        if metrics_data:
            staking_apr = metrics_data.get('staking_apr')
            lido_fee = metrics_data.get('lido_fee')
            # operator_fee = metrics_data.get('operator_fee')
            format_result['staking_apr'] = staking_apr
            format_result['unsettled_lido_fee'] = lido_fee

        #更新dashbaord表信息
        cls.update_stvault_info(vault, format_result)
        return True


    @classmethod
    def get_vault_metrics(cls, vault: str, dashboard: str) -> Optional[Dict[str, Any]]:
        try:
            vault = Web3Tool.check_address(vault)
            dashboard = Web3Tool.check_address(dashboard)

            # 获取latest_report
            latest_report = LazyOracleContractService.get_latest_report_data(vault)
            if not latest_report or not latest_report.get('report_cid'):
                logger.warning(f"vault {vault} 无法获取latest_report，跳过")
                return None

            # 获取metrics数据
            metrics_data = StvaultCliApiService.get_metrics_data(vault, dashboard, latest_report)
            if not metrics_data:
                logger.warning(f"vault {vault} 无法获取metrics_data，跳过")
                return None

            # 更新staking_apr
            statistic_data = metrics_data.get('statisticData')
            lido_fee = metrics_data.get('lidoFee')
            staking_apr = statistic_data.get('netStakingAPR').get('apr_percent')
            operator_fee = statistic_data.get('nodeOperatorRewards')
            result = {
                'staking_apr': float(staking_apr),
                'lido_fee': lido_fee,
                'operator_fee': operator_fee,
            }
            return result
        except Exception as e:
            logger.error(f"更新vault {vault} 的metrics数据时发生异常: {e}", exc_info=True)




    #更新dashbaord表信息
    @classmethod
    def update_stvault_info(cls, vault: str, stvault_info: Dict[str, Any]):
        """
        更新dashbaord表信息
        """
        stvault = StVault.objects.filter(vault=vault).first()
        if not stvault:
            return None
        stvault.update_dashboard_info(stvault_info)


    @classmethod
    def check_remaining_minting_capacity_shares(cls, dashboard: str, amount_shares: int) -> Optional[bool]:
        """
        检查流动性负债是否足够
        """
        dashboard = Web3Tool.check_address(dashboard)
        remaining_minting_capacity_shares = DashboardContractService.get_remaining_minting_capacity_shares(dashboard)
        if remaining_minting_capacity_shares >= amount_shares:
            return True
        return False

    @classmethod
    def check_liability_shares(cls, dashboard: str, amount_wei: int) -> Optional[bool]:
        """
        检查流动性负债是否足够
        """
        dashboard = Web3Tool.check_address(dashboard)
        liability_shares = DashboardContractService.get_liability_shares(dashboard)
        if liability_shares >= amount_wei:
            return True
        return False



    @classmethod
    def get_update_report_data(cls, vault: str) -> tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        更新report数据
        :param vault: vault地址
        :return: (success: bool, data: Optional[Dict], error: Optional[str])
            - (True, tx_dict, None): 成功，返回交易信息
            - (True, None, None): 成功，报告已新鲜，无需更新
            - (False, None, error_msg): 失败，返回错误信息
        """
        try:
            # 检查报告是否新鲜
            vault = Web3Tool.check_address(vault)
            is_report_fresh = VaultHubContractService.is_report_fresh(vault)
            if is_report_fresh:
                return (True, None, None)

            # 获取上传report的数据
            report_data = LazyOracleContractService.get_latest_report_data(vault)
            if not report_data:
                error_msg = f"vault {vault} 无法获取latest_report_data"
                logger.error(error_msg)
                return (False, None, error_msg)

            cid = report_data.get('report_cid')
            if not cid:
                error_msg = f"vault {vault} latest_report_data中缺少report_cid"
                logger.error(error_msg)
                return (False, None, error_msg)

            # 获取report proof
            report = StvaultCliApiService.get_report_proof(vault, cid)
            report_data = report.get('data')
            if not report_data:
                error_msg = f"vault {vault} 无法获取report_data，cid: {cid}"
                logger.error(error_msg)
                return (False, None, error_msg)


            proof = report.get('proof')
            if not proof:
                error_msg = f"vault {vault} report_data中缺少proof"
                logger.error(error_msg)
                return (False, None, error_msg)

            # 更新vault数据
            # 转换参数类型：uint256 需要转换为 int，bytes32[] 需要转换每个元素为 bytes32
            args = [
                vault,  # address
                int(report_data.get('totalValueWei', 0)),  # uint256
                int(report_data.get('fee', 0)),  # uint256
                int(report_data.get('liabilityShares', 0)),  # uint256
                int(report_data.get('maxLiabilityShares', 0)),  # uint256
                int(report_data.get('slashingReserve', 0)),  # uint256
                [Web3Tool.hex_to_bytes(p) if isinstance(p, str) else p for p in proof],  # bytes32[]
            ]

            tx = LazyOracleContractService.updateVaultData(vault, args)
            if not tx:
                error_msg = f"vault {vault} 构建updateVaultData交易失败"
                logger.error(error_msg)
                return (False, None, error_msg)
            logger.info(f"vault {vault} 成功构建updateVaultData交易")
            return (True, tx, None)

        except Exception as e:
            error_msg = f"vault {vault} update_report_data时发生异常: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return (False, None, error_msg)

    # @classmethod
    # def fetchAndCalculateVaultWithNewValue(cls, dashboard: str, value_wei: int, operation_type: VaultOperationType) -> Optional[Dict[str, Any]]:
    #     """
    #     根据新的价值计算 Vault 信息
    #     """
    #     metrics = cls.fetchVaultMetrics(dashboard)
    #     liability_shares = metrics.get('liability_shares', 0)
    #     if operation_type == VaultOperationType.MINT:
    #         new_liability_shares = liability_shares + value_wei
    #     else:
    #         new_liability_shares = liability_shares - value_wei
    #     new_liability_shares_in_steth_wei = STETHContractService.get_pooled_eth_by_shares_round_up(new_liability_shares)
    #     value_in_steth_wei = STETHContractService.get_pooled_eth_by_shares(value_wei)
    #     return {
    #         "liability_shares": liability_shares,
    #         "new_liability_shares": new_liability_shares,
    #         "liability_shares_in_steth_wei": new_liability_shares_in_steth_wei,
    #         "value_in_steth_wei": value_in_steth_wei
    #     }


    @classmethod
    def fetch_vault_health(cls, dashboard: str) -> Optional[Dict[str, Any]]:
        """
        获取 Vault 健康因子
        """
        dashboard = Web3Tool.check_address(dashboard)
        # 获取健康因子计算参数
        results = DashboardContractService.get_vault_connection(dashboard)
        if not results:
            return None
        total_value = results.get('total_value')
        forced_rebalance_threshold_bp = results.get('vault_connection').get('forced_rebalance_threshold_bp')
        liability_shares = results.get('liability_shares')
        liability_shares_in_steth_wei = STETHContractService.get_pooled_eth_by_shares(liability_shares)
        # 计算健康因子
        calculate_info = StvaultUtil.calculate_health(total_value, liability_shares_in_steth_wei, forced_rebalance_threshold_bp)
        health_info = {
            "health_ratio": calculate_info.get('health_ratio'),
            "is_healthy": calculate_info.get('is_healthy'),
            "total_value": total_value,
            "total_value_in_eth": Web3Tool.format_ether(total_value),
            "liability_shares_in_steth_wei": liability_shares_in_steth_wei,
            "liability_shares_in_steth": Web3Tool.format_ether(liability_shares_in_steth_wei),
            "forced_rebalance_threshold_bp": forced_rebalance_threshold_bp,
            "liability_shares_in_wei": liability_shares,
            "liability_shares": Web3Tool.format_ether(liability_shares),
        }
        return health_info


    @classmethod
    def fetch_vault_metrics(cls, dashboard: str) -> Optional[Dict[str, Any]]:
        """
        获取 Vault 指标
        """
        # 定义所有查询任务
        tasks = {
            'total_value': lambda: DashboardContractService.get_total_value(dashboard),
            'liability_shares': lambda: DashboardContractService.get_liability_shares(dashboard),
            'vault_connection': lambda: DashboardContractService.get_vault_connection(dashboard),
        }
        # 并发执行所有查询
        results = {}
        with ThreadPoolExecutor(max_workers=10) as executor:
            # 提交所有任务
            future_to_key = {
                executor.submit(task): key
                for key, task in tasks.items()
            }

            # 使用 as_completed 来检查完成情况，如果有失败立即返回
            for future in as_completed(future_to_key):
                key = future_to_key[future]
                try:
                    result = future.result()
                    results[key] = result
                except Exception as e:
                    # 任何查询失败，立即返回 None
                    logger.error(f"Failed to query {key} for dashboard {dashboard}: {e}", exc_info=True)
                    return None

        # 计算流动性负债（ETH）
        forced_rebalance_threshold_bp = results.get('vault_connection').get('forced_rebalance_threshold_bp')
        results['forced_rebalance_threshold_bp'] = forced_rebalance_threshold_bp
        liability_shares = results.get('liability_shares')
        liability_shares_in_steth_wei = STETHContractService.get_pooled_eth_by_shares(liability_shares)
        results['liability_shares_in_steth_wei'] = liability_shares_in_steth_wei
        return results
