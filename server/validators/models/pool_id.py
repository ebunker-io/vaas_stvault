from django.db import models
from mysite.appconfig import AppConfig
from ..tool.decimal_util import DecimalUtil


class PoolId(models.Model):
    def __str__(self):
        return self.name

    name = models.CharField(max_length=50, unique=True, default='ebunker', verbose_name='name')

    """
    用户commission取值路径：Customer.commission -> PoolId.commission -> Config.commission
    """
    customer_fee_commission = models.FloatField(null=True, blank=True, default=None, verbose_name='fee手续费比例')
    customer_mev_commission = models.FloatField(null=True, blank=True, default=None, verbose_name='mev手续费比例')

    """
    矿池利润抽成，抽取比例
    """
    pool_fee_commission = models.FloatField(default=1, verbose_name='矿池fee手续费抽成比例')
    pool_mev_commission = models.FloatField(default=1, verbose_name='矿池mev手续费抽成比例')
    created_time = models.DateTimeField(auto_now_add=True, blank=True)
    updated_time = models.DateTimeField(auto_now=True, blank=True)

    def get_customer_fee_commission(self):
        customer_fee_commission = self.customer_fee_commission
        if not customer_fee_commission:
            customer_fee_commission = AppConfig.value_for_key(AppConfig.FEE_COMMISSION)
        return DecimalUtil.safe_decimal(customer_fee_commission)

    def get_customer_mev_commission(self):
        customer_mev_commission = self.customer_mev_commission
        if not customer_mev_commission:
            customer_mev_commission = AppConfig.value_for_key(AppConfig.MEV_COMMISSION)
        return DecimalUtil.safe_decimal(customer_mev_commission)

    def get_pool_fee_commission(self):
        pool_fee_commission = self.pool_fee_commission
        if not pool_fee_commission:
            pool_fee_commission = AppConfig.value_for_key(AppConfig.POOL_FEE_COMMISSION)
        if not pool_fee_commission:
            pool_fee_commission = 1
        return DecimalUtil.safe_decimal(pool_fee_commission)

    def get_pool_mev_commission(self):
        pool_mev_commission = self.pool_mev_commission
        if not pool_mev_commission:
            pool_mev_commission = AppConfig.value_for_key(AppConfig.POOL_MEV_COMMISSION)
        if not pool_mev_commission:
            pool_mev_commission = 1
        return DecimalUtil.safe_decimal(pool_mev_commission)

    @classmethod
    def init_source(cls):
        """
        初始化poolid data
        """
        count = cls.objects.count()
        if count == 0:
            pool_id = PoolId()
            pool_id.name = 'ebunker'
            pool_id.pool_fee_commission = '1'
            pool_id.pool_mev_commission = '1'
            pool_id.save()