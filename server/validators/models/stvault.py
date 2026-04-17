import json
import logging
from enum import Enum
from decimal import Decimal
from django.db import models, transaction
from datetime import datetime

logger = logging.getLogger(__name__)


class StVault(models.Model):
    """
    StVault 业务表（单表设计）
    - 包含所有字段，使用 defer()/only() 优化查询性能
    - 列表查询：只加载列表需要的字段
    - 详情查询：加载所有字段
    """

    class VaultStatus(Enum):
        PROVISIONED = 'provisioned'
        PENDING = 'pending'
        SUCCESS = 'success'
        FAILED = 'failed'

        @classmethod
        def choices(cls):
            return tuple((i.value, i.value) for i in cls)

    def __str__(self):
        return f"StVault({self.create_hash})-{self.vault or 'uninitialized'}"

    # ===== 基本信息和状态 =====
    vault = models.CharField(max_length=200, null=True, blank=True, unique=True, help_text='StakingVault 合约地址')
    status = models.CharField(max_length=20, choices=VaultStatus.choices(), default=VaultStatus.PROVISIONED.value, help_text='Vault 创建状态')
    dashboard = models.CharField(max_length=200, null=True, blank=True, unique=True, help_text='Dashboard 合约地址')
    vault_owner = models.CharField(max_length=200, help_text='Vault 所有者（默认管理员）地址')
    node_operator = models.CharField(max_length=200, null=True, blank=True, help_text='节点运营商地址')
    node_operator_manager = models.JSONField(max_length=200, null=True, blank=True, help_text='节点运营商管理员地址')

    total_value = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='Vault 总余额（ETH）')
    vault_balance = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='Vault ETH 余额（Wei）')
    staking_apr = models.FloatField(default=0, help_text='Vault 质押 APR（列表展示，频繁更新）')
    health_factor = models.CharField(max_length=50, default='Infinity', help_text='Vault 健康因子（Infinity为无穷大）')
    liability_steth = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='Vault 流动性负债（ETH）')
    remaining_minting_steth = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='剩余铸造容量份额（Wei）')
    total_minting_steth = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='总铸造容量份额（Wei）')
    withdrawable_value = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='可提取价值（Wei）')
    locked = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='锁定值（Wei）')
    operator_fee_rate = models.FloatField(default=0, help_text='节点运营商费用率（%）')
    undisbursed_operator_fee = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='节点运营商费用（Wei）')
    infra_fee = models.FloatField(default=0, help_text='基础设施费用（Wei）')
    liquidity_fee = models.FloatField(default=0, help_text='流动性费用（Wei）')
    unsettled_lido_fee = models.DecimalField(max_digits=30, decimal_places=0, default=0, help_text='Lido 费用（Wei）')
    confirm_expiry = models.IntegerField(default=0, help_text='确认过期时间（秒）')
    tier_id = models.IntegerField(default=0, help_text='Tier ID')

    create_hash = models.CharField(max_length=100, null=True, blank=True, unique=True, help_text='创建 StVault 的交易哈希')
    block_number = models.CharField(max_length=50, null=True, blank=True, help_text='创建 StVault 的区块高度')
    block_timestamp = models.CharField(max_length=50, null=True, blank=True, help_text='创建 StVault 的区块时间戳')
    refresh_all_data_time = models.DateTimeField(null=True, blank=True, help_text='刷新所有vault数据的时间')
    created_time = models.DateTimeField(auto_now_add=True, blank=True)
    updated_time = models.DateTimeField(auto_now=True, blank=True)

    class Meta:
        db_table = 'stvault'
        indexes = [
            models.Index(fields=['vault_owner', 'status']),
            models.Index(fields=['vault_owner']),
        ]
        ordering = ['-created_time']

    # ===== 便捷属性/方法 =====
    @property
    def is_provisioned(self) -> bool:
        return self.status == self.VaultStatus.PROVISIONED.value

    @property
    def is_pending(self) -> bool:
        return self.status == self.VaultStatus.PENDING.value

    @property
    def is_success(self) -> bool:
        return self.status == self.VaultStatus.SUCCESS.value

    @property
    def is_failed(self) -> bool:
        return self.status == self.VaultStatus.FAILED.value

    @property
    def health_ratio(self) -> float:
        """从 health_info 中获取健康比率"""
        if self.health_factor and isinstance(self.health_factor, float):
            return self.health_factor
        return 0.0

    @property
    def is_healthy(self) -> bool:
        """从 health_info 中获取健康状态"""
        if self.health_factor > 100:
            return True
        return False


    # ===== 查询方法 =====
    @classmethod
    def list_fields(cls):
        """
        返回列表查询需要的字段列表
        :return: 字段名列表
        """
        return [
            'vault', 'vault_owner', 'dashboard', 'operator_fee_rate', 'staking_apr', 'health_factor', 'liability_steth', 'remaining_minting_steth', 'total_minting_steth', 'withdrawable_value', 'locked', 'undisbursed_operator_fee', 'unsettled_lido_fee', 'status','created_time'
        ]

    @classmethod
    def dashboard_fields(cls):
        """
        返回vault的所有字段列表
        :return: 字段名列表
        """
        excluded = {'id', 'block_number', 'block_timestamp', 'updated_time', 'create_hash'}
        all_fields = [
            f.name for f in cls._meta.get_fields()
            if hasattr(f, 'name') and not f.many_to_many and not f.one_to_many
        ]
        return [f for f in all_fields if f not in excluded]

    @classmethod
    def decimal_fields(cls):
        """
        返回所有 DecimalField 字段名列表
        :return: Decimal 字段名集合
        """
        return {
            'total_value',
            'vault_balance',
            'liability_steth',
            'remaining_minting_steth',
            'total_minting_steth',
            'withdrawable_value',
            'locked',
            'undisbursed_operator_fee',
            'unsettled_lido_fee',
        }

    @classmethod
    def get_list_queryset(cls, vault_owner=None):
        """
        获取列表查询的数据（字典列表）
        :param vault_owner: 可选的 vault_owner 过滤
        :return: 字典列表，只包含 list_fields 中的字段
        """
        queryset = cls.objects.filter(status=StVault.VaultStatus.SUCCESS.value).order_by('-created_time')
        if vault_owner:
            queryset = queryset.filter(vault_owner=vault_owner)
        list_fields = cls.list_fields()
        return list(queryset.values(*list_fields))

    # 查询owner的vault list信息
    @classmethod
    def get_dashboard_queryset(cls, vault_owner=None):
        """
        获取详情查询的数据（字典列表）
        :param vault_owner: 可选的 vault_owner 过滤
        :return: 字典列表，只包含 dashboard_fields 中的字段
        """
        queryset = cls.objects.filter(status=StVault.VaultStatus.SUCCESS.value).order_by('-created_time')
        if vault_owner:
            queryset = queryset.filter(vault_owner=vault_owner)
        dashboard_fields = cls.dashboard_fields()
        data = list(queryset.values(*dashboard_fields))
        # 将 node_operator_manager 从 JSON 字符串转换为 JSON 对象
        for item in data:
            if 'node_operator_manager' in item and item['node_operator_manager']:
                try:
                    item['node_operator_manager'] = json.loads(item['node_operator_manager'])
                except (json.JSONDecodeError, TypeError):
                    item['node_operator_manager'] = []
            elif 'node_operator_manager' in item:
                item['node_operator_manager'] = []
        return data

    # 查询vault的详情信息
    @classmethod
    def get_dashboard_vault(cls, vault: str):
        """
        获取详情查询的数据（字典）
        :param vault: vault 地址
        :return: 字典，只包含 dashboard_fields 中的字段，如果不存在则返回 None
        """
        dashboard_fields = cls.dashboard_fields()
        data = cls.objects.filter(vault=vault).values(*dashboard_fields).first()
        # 将 node_operator_manager 从 JSON 字符串转换为 JSON 对象
        if data and 'node_operator_manager' in data:
            if data['node_operator_manager']:
                try:
                    data['node_operator_manager'] = json.loads(data['node_operator_manager'])
                except (json.JSONDecodeError, TypeError):
                    data['node_operator_manager'] = []
            else:
                data['node_operator_manager'] = []
        return data

    @transaction.atomic
    def update_dashboard_info(self, dashboard_info: dict):
        """
        从合约数据完整更新 Vault 信息
        使用事务保证数据一致性

        :param dashboard_info: get_stvault_info 返回的字典
        """
        if not dashboard_info:
            logger.warning(f"Empty dashboard_info for stvault {self.vault}")
            return

        update_fields = []

        # 更新总价值（total_value: Wei -> total_value: ETH）
        if 'total_value' in dashboard_info:
            self.total_value = Decimal(str(dashboard_info.get('total_value', 0)))
            update_fields.append('total_value')

        # 更新余额（balance: Wei -> vault_balance: Wei）
        if 'balance' in dashboard_info:
            self.vault_balance = Decimal(str(dashboard_info.get('balance', 0)))
            update_fields.append('vault_balance')

        if 'staking_apr' in dashboard_info:
            self.staking_apr = float(dashboard_info.get('staking_apr', 0.0))
            update_fields.append('staking_apr')

        if 'health_factor' in dashboard_info:
            self.health_factor = str(dashboard_info.get('health_factor', 'Infinity'))
            update_fields.append('health_factor')

        # 更新流动性负债（liability_steth: Wei -> liability_steth: ETH）
        if 'liability_steth' in dashboard_info:
            self.liability_steth = Decimal(str(dashboard_info.get('liability_steth', 0)))
            update_fields.append('liability_steth')

        # 更新剩余铸造容量（remaining_minting_capacity_steth: Wei -> remaining_minting_steth: Wei）
        if 'remaining_minting_capacity_steth' in dashboard_info:
            self.remaining_minting_steth = Decimal(str(dashboard_info.get('remaining_minting_capacity_steth', 0)))
            update_fields.append('remaining_minting_steth')

        # 更新总铸造容量（total_minting_capacity_steth: Wei -> total_minting_steth: Wei）
        if 'total_minting_capacity_steth' in dashboard_info:
            self.total_minting_steth = Decimal(str(dashboard_info.get('total_minting_capacity_steth', 0)))
            update_fields.append('total_minting_steth')

        # 更新可提取价值（withdrawable_value: Wei -> withdrawable_value: Wei）
        if 'withdrawable_value' in dashboard_info:
            self.withdrawable_value = Decimal(str(dashboard_info.get('withdrawable_value', 0)))
            update_fields.append('withdrawable_value')

        # 更新锁定值（locked: Wei -> locked: Wei）
        if 'locked' in dashboard_info:
            self.locked = Decimal(str(dashboard_info.get('locked', 0)))
            update_fields.append('locked')

        # 更新节点运营商费用率（operator_fee_rate: "1.00%" -> operator_fee_rate: Float %）
        if 'operator_fee_rate' in dashboard_info:
            self.operator_fee_rate = float(dashboard_info.get('operator_fee_rate', '0'))
            update_fields.append('operator_fee_rate')

        # 更新未发放的节点运营商费用（undisbursed_operator_fee: Wei -> undisbursed_operator_fee: Wei）
        if 'undisbursed_operator_fee' in dashboard_info:
            self.undisbursed_operator_fee = Decimal(str(dashboard_info.get('undisbursed_operator_fee', 0)))
            update_fields.append('undisbursed_operator_fee')

        # 更新基础设施费用（infra_fee）
        if 'infra_fee' in dashboard_info:
            self.infra_fee = float(dashboard_info.get('infra_fee', 0))
            update_fields.append('infra_fee')

        # 更新流动性费用
        if 'liquidity_fee' in dashboard_info:
            self.liquidity_fee = float(dashboard_info.get('liquidity_fee', 0))
            update_fields.append('liquidity_fee')

        # 更新未发放的节点运营商费用
        if 'unsettled_lido_fee' in dashboard_info:
            self.unsettled_lido_fee = Decimal(str(dashboard_info.get('unsettled_lido_fee', 0)))
            update_fields.append('unsettled_lido_fee')

        # 更新确认过期时间（confirm_expiry: 秒 -> confirm_expiry: 秒）
        if 'confirm_expiry' in dashboard_info:
            self.confirm_expiry = int(dashboard_info.get('confirm_expiry', 0))
            update_fields.append('confirm_expiry')

        # 更新刷新所有vault数据的时间
        if 'refresh_all_data_time' in dashboard_info:
            self.refresh_all_data_time = datetime.now()
            update_fields.append('refresh_all_data_time')

        if update_fields:
            update_fields.append('updated_time')
            self.save(update_fields=update_fields)
            logger.info(f"Updated StVault {self.vault} from dashboard_info, fields: {update_fields}")
        else:
            logger.debug(f"No fields to update for StVault {self.vault}")