import json
import logging
from validators.models.stvault_config import StVaultConfig
from validators.service.eth_service import ETHService
from validators.notification.notification import Notification, NotificationType
from validators.tool.web3 import Web3Tool
from typing import Union, Optional, Any, List, Dict
from validators.contract.stvault import config
from validators.models.stvault import StVault
from validators.contract.stvault.service.create import CreateVaultService
from validators.contract.stvault.service.stvault import StvaultService
import datetime
from validators.tool.decimal_util import DecimalUtil
from django.conf import settings
from django.db.models import Q, Sum
from django.utils import timezone
from validators.models.stvault import StVault
from validators.models.statistics import Statistics


logger = logging.getLogger(__name__)

BATCH_SIZE = 2000
NODE_OPERATOR_SET_TOPIC = config.NODE_OPERATOR_SET_TOPIC
CREATE_CONTRACT_ADDRESS = config.CREATE_CONTRACT_ADDRESS
OPERATOR_EVENT_KEY = 'OPERATOR_EVENT_BLOCK'

class StVaultTask(object):

    @classmethod
    def stvault_event_task(cls):
        cls.set_node_operator_event()


    @classmethod
    def set_node_operator_event(cls):
        try:
            latest_block = ETHService.get_latest_block()
            from_block = StVaultConfig.get_int_value(OPERATOR_EVENT_KEY, 1937244)
            if from_block >=  latest_block:
                return
            from_block = from_block + 1

            # 分批请求
            while from_block <= latest_block:
                end_block = from_block + BATCH_SIZE
                if end_block > latest_block:
                    end_block = latest_block

                logs = cls.get_node_operator_set_topic(from_block, end_block)
                # 保存扫描到的区块到stvault里
                for log in logs:
                    tx_hash = log['tx_hash']
                    node_operator = Web3Tool.check_address(config.get_operator_address())
                    #如果tx_hash不存在则存储到stvault表里
                    stvault = StVault.objects.filter(create_hash=tx_hash).first()
                    if not stvault:
                        stvault = StVault.objects.create(create_hash=tx_hash,
                                                         node_operator=node_operator,
                                                         status=StVault.VaultStatus.PENDING.value,
                                                         block_number=log['block_number'],
                                                         block_timestamp=log['block_timestamp'])

                    else:
                        stvault.node_operator = node_operator
                        if stvault.status == StVault.VaultStatus.PROVISIONED.value:
                            stvault.status = StVault.VaultStatus.PENDING.value
                        stvault.block_number = log['block_number']
                        stvault.block_timestamp = int(log['block_timestamp'])
                        stvault.save(update_fields=['node_operator', 'status', 'block_number', 'block_timestamp'])
                    cls.get_init_vault_info()


                # 保存扫描到的区块
                StVaultConfig.set_value(OPERATOR_EVENT_KEY, end_block)
                from_block = end_block + 1
        except Exception as e:
            logger.error('EventTask set_node_operator_event err: %s', str(e))

    # 获取节点运营商设置事件的日志
    @classmethod
    def get_node_operator_set_topic(cls, from_block: int, to_block: int) -> Optional[List[str]]:
        node_operator = config.get_operator_address()
        node_operator = Web3Tool.encode_bytes32_address(node_operator)
        topics = [NODE_OPERATOR_SET_TOPIC, node_operator]
        result = Web3Tool.get_logs(from_block, to_block, topics)
        return result

    @classmethod
    def get_init_vault_info(cls):
        # 获取所有pengding状态的stvault
        stvaults = StVault.objects.filter(status=StVault.VaultStatus.PENDING.value)
        for stvault in stvaults:
            tx_hash = stvault.create_hash
            abi = CreateVaultService.get_create_abi()
            web3_tx = Web3Tool.parse_event_logs(abi, tx_hash, CREATE_CONTRACT_ADDRESS)
            dashboard_event = next((event for event in web3_tx if event.get('event_name') == 'DashboardCreated'), None)
            dashboard_args = dashboard_event['event_args']
            vault = dashboard_args['vault']
            dashboard = dashboard_args['dashboard']
            vault_owner = dashboard_args['admin']
            operator_manager_list = StvaultService.refresh_vault_operator_manager(dashboard)
            # 将数组转换为JSON字符串
            operator_manager_str = json.dumps(operator_manager_list)

            # 更新stvault表
            stvault.vault = Web3Tool.check_address(vault)
            stvault.dashboard = Web3Tool.check_address(dashboard)
            stvault.vault_owner = Web3Tool.check_address(vault_owner)
            stvault.node_operator_manager = operator_manager_str
            stvault.status = StVault.VaultStatus.SUCCESS.value
            stvault.save(update_fields=['vault', 'dashboard', 'vault_owner', 'node_operator_manager', 'status'])

            # 更新vault数据
            StvaultService.refresh_stvault(stvault.vault)

            # 发送vault创建成功通知
            contents = ['StVault 创建成功']
            contents.append(f'Vault: {stvault.vault}')
            contents.append(f'Dashboard: {stvault.dashboard}')
            contents.append(f'Vault-Owner: {stvault.vault_owner}')
            contents.append(f'Create-Hash: {tx_hash}')
            Notification.send_contents(contents, NotificationType.DAILY_REPORT)


    @classmethod
    def refresh_all_success_vaults(cls):
        """
        更新所有SUCCESS状态的vault数据。
        只处理 refresh_all_data_time 不在当天 0 点之后的数据（含从未刷新的）。
        """
        try:
            tz = timezone.get_current_timezone() if settings.USE_TZ else timezone.get_default_timezone()
            today_start = timezone.now().astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)
            stvaults = StVault.objects.filter(
                status=StVault.VaultStatus.SUCCESS.value
            ).filter(
                Q(refresh_all_data_time__isnull=True) | Q(refresh_all_data_time__lt=today_start)
            )
            total_count = stvaults.count()
            logger.info(f"开始更新所有SUCCESS状态的vault数据，共{total_count}个")

            success_count = 0
            fail_count = 0

            for stvault in stvaults:
                if not stvault.vault:
                    logger.warning(f"StVault {stvault.id} 没有vault地址，跳过")
                    continue

                try:
                    result = StvaultService.refresh_stvault(stvault.vault)
                    if result:
                        success_count += 1
                        logger.debug(f"成功更新vault {stvault.vault}")
                    else:
                        fail_count += 1
                        logger.warning(f"更新vault {stvault.vault} 失败")
                except Exception as e:
                    fail_count += 1
                    logger.error(f"更新vault {stvault.vault} 时发生异常: {e}", exc_info=True)

            logger.info(f"vault数据更新完成，成功: {success_count}, 失败: {fail_count}, 总计: {total_count}")
        except Exception as e:
            logger.error(f"更新所有vault数据时发生异常: {e}", exc_info=True)

    @classmethod
    def update_staking_apr(cls):
        """
        更新所有SUCCESS状态的vault的staking_apr
        """
        try:
            stvaults = StVault.objects.filter(status=StVault.VaultStatus.SUCCESS.value)
            total_count = stvaults.count()
            logger.info(f"开始更新所有SUCCESS状态的vault的staking_apr，共{total_count}个")

            success_count = 0
            fail_count = 0
            for stvault in stvaults:
                if not stvault.vault or not stvault.dashboard:
                    logger.warning(f"StVault {stvault.id} 缺少vault或dashboard地址，跳过")
                    continue

                try:
                    metrics_data = StvaultService.get_vault_metrics(stvault.vault, stvault.dashboard)
                    if not metrics_data:
                        logger.warning(f"vault {stvault.vault} 无法获取metrics_data，跳过")
                        fail_count += 1
                        continue
                    staking_apr = metrics_data.get('staking_apr')
                    lido_fee = metrics_data.get('lido_fee')
                    operator_fee = metrics_data.get('operator_fee')

                    # 更新staking_apr
                    if staking_apr and lido_fee and operator_fee is not None:
                        stvault.staking_apr = staking_apr
                        stvault.unsettled_lido_fee = lido_fee
                        stvault.undisbursed_operator_fee = operator_fee
                        stvault.save(update_fields=['staking_apr', 'unsettled_lido_fee', 'undisbursed_operator_fee', 'updated_time'])
                        success_count += 1
                    else:
                        logger.warning(f"vault {stvault.vault} 的metrics_data中未找到staking_apr或lido_fee或operator_fee字段")
                        fail_count += 1

                except Exception as e:
                    fail_count += 1
                    logger.error(f"更新vault {stvault.vault} 的staking_apr时发生异常: {e}", exc_info=True)

            logger.info(f"staking_apr更新完成，成功: {success_count}, 失败: {fail_count}, 总计: {total_count}")
        except Exception as e:
            logger.error(f"更新所有vault的staking_apr时发生异常: {e}", exc_info=True)


    @classmethod
    def daily_statistics(cls):
        """
        每天0点1分统计stvault的数据
        统计：
        - stvault 的数量
        - 总 ETH 数量（total_value 总和）
        - 总未质押的 ETH 数量（vault_balance 总和）
        - 用户数量（按 vault_owner 去重统计）
        """
        try:
            today = datetime.datetime.now()
            date = datetime.date(year=today.year, month=today.month, day=today.day)

            # 查询当天的数据是否已存在
            if Statistics.objects.filter(name='stvault', date=date).exists():
                logger.info(f'StVaultStatisticsTask daily_statistics date: {date} already exists')
                return

            # 只统计 SUCCESS 状态的 vault
            queryset = StVault.objects.filter(status=StVault.VaultStatus.SUCCESS.value)

            # 统计 stvault 数量
            vault_count = queryset.count()

            # 统计总 ETH 数量（total_value 总和）保留2位小数
            total_eth_result = queryset.aggregate(total=Sum('total_value'))
            total_eth = DecimalUtil.quantize(total_eth_result.get('total') / 10 ** 18, 2)

            # 统计总未质押的 ETH 数量（vault_balance 总和）
            total_unstaked_result = queryset.aggregate(total=Sum('vault_balance'))
            total_unstaked_eth = DecimalUtil.quantize(total_unstaked_result.get('total') / 10 ** 18, 2)

            # 统计用户数量（按 vault_owner 去重）
            user_count = queryset.values('vault_owner').distinct().count()

            # 构建统计数据
            data = {
                'user_count': int(user_count),
                'vault_count': int(vault_count),
                'total_eth': str(total_eth),
                'total_unstaked_eth': str(total_unstaked_eth),
            }

            # 保存到 Statistics 表
            statistics, created = Statistics.objects.update_or_create(
                name='stvault',
                date=date,
                defaults={
                    'data': json.dumps(data, ensure_ascii=False),
                    'remark': 'StVault日数据统计'
                }
            )
            if created:
                logger.info(f'StVaultStatisticsTask created new statistics record for {date}')
        except Exception as e:
            logger.error(f'StVaultStatisticsTask daily_statistics error: {str(e)}', exc_info=True)


    @classmethod
    def check_low_health_factor(cls):
        """
        检查健康值低于105的vault并发送告警通知
        """
        try:
            # 查询所有SUCCESS状态的vault，只查询需要的字段
            stvaults = StVault.objects.filter(status=StVault.VaultStatus.SUCCESS.value).values('vault', 'vault_owner', 'health_factor')
            low_health_vaults = []

            for stvault in stvaults:
                health_factor = stvault['health_factor']
                # 跳过 Infinity
                if health_factor == 'Infinity':
                    continue

                try:
                    # 将字符串转换为浮点数进行比较
                    health_value = float(health_factor)
                    if health_value < 105:
                        low_health_vaults.append({
                            'vault': stvault['vault'] or 'N/A',
                            'vault_owner': stvault['vault_owner'] or 'N/A',
                            'health_factor': health_factor,
                        })
                except (ValueError, TypeError):
                    # 如果无法转换为数字，记录警告但继续处理
                    logger.warning(f"vault {stvault['vault']} 的health_factor值无法转换为数字: {health_factor}")
                    continue

            # 如果有低健康值的vault，发送告警
            if low_health_vaults:
                title="StVault 健康值预警"
                columns=[
                    {"name": "col1", "display_name": "Vault"},
                    {"name": "col2", "display_name": "VaultOwner"},
                    {"name": "col3", "display_name": "Health"}
                ]
                data_list = []
                for vault_info in low_health_vaults:
                    item = {
                        "col1": vault_info["vault"],
                        "col2": vault_info["vault_owner"],
                        "col3": f'{vault_info["health_factor"]}%',
                    }
                    data_list.append(item)
                Notification.send_lark_table(title=title, data_list=data_list, columns=columns, notification_type=NotificationType.NOTICE_REPORT)

        except Exception as e:
            logger.error(f"检查vault健康值时发生异常: {e}", exc_info=True)

    @classmethod
    def check_high_balance_vaults(cls):
        """
        检查withdrawable_value大于等于1的vault并发送通知
        """
        try:
            from decimal import Decimal
            # 查询所有SUCCESS状态的vault，withdrawable_value > 1 ETH
            stvaults = StVault.objects.filter(
                status=StVault.VaultStatus.SUCCESS.value,
                withdrawable_value__gte=Decimal('1000000000000000000')
            ).values('vault', 'vault_owner', 'withdrawable_value')
            high_balance_vaults = list(stvaults)
            # 如果有高余额的vault，发送通知
            if high_balance_vaults:
                title="StVault可质押余额通知"
                columns=[
                    {"name": "col1", "display_name": "Vault"},
                    {"name": "col2", "display_name": "VaultOwner"},
                    {"name": "col3", "display_name": "可质押余额"}
                ]
                data_list = []
                for vault_info in high_balance_vaults:
                    item = {
                        "col1": vault_info["vault"],
                        "col2": vault_info["vault_owner"],
                        "col3": str(int(vault_info["withdrawable_value"])/10 ** 18),
                    }
                    data_list.append(item)
                Notification.send_lark_table(title=title, data_list=data_list, columns=columns, notification_type=NotificationType.NOTICE_REPORT)

        except Exception as e:
            logger.error(f"检查vault余额时发生异常: {e}", exc_info=True)
