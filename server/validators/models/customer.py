import logging
import time
import datetime
from django.utils import timezone
from django.db import models
from django.core import mail
from django.conf import settings
from mysite.appconfig import AppConfig
from django.contrib import admin
from .pool_id import PoolId
import validators
import requests
import json
from validators.notification.notification import Notification
from validators.notification.notification import NotificationType

logger = logging.getLogger(__name__)


class Customer(models.Model):
    def __str__(self):
        return (self.name and (self.name + '_' + self.pool_id.name)) or (self.reward_address + '_' + self.pool_id.name)
    """
    同一个地址在不同pool_id下为不同用户
    """

    pool_id = models.ForeignKey(PoolId, on_delete=models.DO_NOTHING, verbose_name='矿池对应ID')
    name = models.CharField(max_length=200, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True, default=None)
    # 是否登录过
    is_login = models.BooleanField(default=False)
    verifying_phone = models.CharField(max_length=20, null=True, blank=True, default=None)
    email = models.CharField(max_length=30, null=True, blank=True, default=None)
    verifying_email = models.CharField(max_length=30, null=True, blank=True, default=None)
    reward_address = models.CharField(max_length=100)
    remark = models.CharField(max_length=200, null=True, blank=True)
    fee_commission = models.FloatField(null=True, blank=True, default=None)
    mev_commission = models.FloatField(null=True, blank=True, default=None)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    agent = models.TextField(null=True, blank=True, verbose_name='登录设备信息')
    execution_withdraw_address = models.CharField(max_length=100, null=True, blank=True, verbose_name='执行层收益地址')
    consensus_withdraw_address = models.CharField(max_length=100, null=True, blank=True, verbose_name='共识层收益地址')
    created_time = models.DateTimeField(auto_now_add=True, blank=True)
    updated_time = models.DateTimeField(auto_now=True, blank=True)
    enable_create_order = models.BooleanField(default=True, verbose_name='是否能创建订单，连续取消订单过多会置为false')
    enjoy_promote = models.BooleanField(default=False)
    promote_start_at = models.IntegerField(default=0)

    class Meta:
        unique_together = ['pool_id', 'reward_address']

    def get_captcha(self, kind='login', params = {}):
        """
        获取验证码
        :param kind: 验证码类型, 具体参考captcha表kind属性
        """
        captcha = self.captcha_set.filter(
            kind=kind, expired_at__gte=time.time()).first()
        if not captcha:
            # 删除过期验证码
            self.captcha_set.filter(kind=kind).delete()
            code = ""
            if kind == 'login':
                code='''You are signing this message to sign in to ebunker.io.\nThis is not a transaction and will not be broadcast or cost/use your fund. :)\n\nNonce: ''' + validators.models.Captcha.generate_code('number', 6, True)
            elif kind == 'bind_execution':
                code='''You are signing this message to change execution reward address to ''' + params['address'] + ''' for ebunker.io.\nThis is not a transaction and will not be broadcast or cost/use your fund. :)\n\nNonce: ''' + validators.models.Captcha.generate_code('number', 6, True)
            elif kind == 'bind_consensus':
                code='''You are signing this message to change consensus reward address to ''' + params['address'] + ''' for ebunker.io.\nThis is not a transaction and will not be broadcast or cost/use your fund. :)\n\nNonce: ''' + validators.models.Captcha.generate_code('number', 6, True)
            elif kind == 'validator_exit':
                code = '''You are signing this message to exit validator ''' + params['pubkey'] + ''' for ebunker.io.\nThis is not a transaction and will not be broadcast or cost/use your fund. :)\n\nNonce: ''' + validators.models.Captcha.generate_code(
                    'number', 6, True)
            else:
                code=validators.models.Captcha.generate_code()
            captcha = self.captcha_set.create(
                kind=kind, code=code, expired_at=time.time() + 300)
        if kind == 'bind_email':
            # 发送邮件
            params = {
                'address': self.reward_address,
                'code': captcha.code,
            }
            Notification.send_template_email([self.verifying_email], 'bind_email', params)
            return True
        elif kind == 'bind_phone':
            pass
        else:
            return captcha

    def verify_captcha(self, code, kind='login'):
        """
        验证验证码
        :param code: 验证码
        :param kind: 验证码类型, 具体参考captcha表kind属性
        """
        captcha = self.captcha_set.filter(
            kind=kind, code=code, expired_at__gte=time.time()).first()
        print('verify_captcha', captcha)
        if not captcha:
            return False
        return True

    @classmethod
    def get_eth_balance(cls, address):
        """
        查询钱包ETH余额
        :param address: eth钱包地址
        """
        try:
            data = {
                "jsonrpc": "2.0",
                "method": "eth_getBalance",
                "params": [
                    address,
                    "latest"
                ],
                "id": 1
            }
            headers = {'content-type': 'application/json'}
            res = requests.post(settings.ETH1['endpoint'], data=json.dumps(data), headers=headers).json()
            if res.get('error'):
                return 0
            return int(res['result'], 16) / 1e18
        except Exception as e:
            logger.error("get_eth_balance err:%s", str(e))
            Notification.send_template('handled_exception', {"msg": e}, notification_type=NotificationType.ALARM_REPORT)
            return 0

    def config_fee_commission(self):
        fee_commission = self.pool_id.customer_fee_commission
        if fee_commission is None:
            fee_commission = AppConfig.value_for_key(AppConfig.FEE_COMMISSION)
        return float(fee_commission)

    def config_mev_commission(self):
        mev_commission = self.pool_id.customer_mev_commission
        if mev_commission is None:
            mev_commission = AppConfig.value_for_key(AppConfig.MEV_COMMISSION)
        return float(mev_commission)

    def get_fee_commission(self):
        fee_commission = self.fee_commission
        if fee_commission is None:
            fee_commission = self.pool_id.customer_fee_commission
            if fee_commission is None:
                fee_commission = AppConfig.value_for_key(AppConfig.FEE_COMMISSION)
        return float(fee_commission)

    def get_mev_commission(self):
        mev_commission = self.mev_commission
        if mev_commission is None:
            mev_commission = self.pool_id.customer_mev_commission
            if mev_commission is None:
                mev_commission = AppConfig.value_for_key(AppConfig.MEV_COMMISSION)
        return float(mev_commission)

    @admin.display(
        boolean=True,
        ordering='created_time',
        description='Published recently?',
    )
    def was_published_recently(self):
        now = timezone.now()
        return now - datetime.timedelta(days=1) <= self.created_time <= now


