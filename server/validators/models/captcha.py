from django.db import models
from .customer import Customer
import random
import string
import time


class Captcha(models.Model):
    def __str__(self):
        return self.code

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, null=True)
    code = models.TextField()
    expired_at = models.IntegerField(default=None)
    used_at = models.DateTimeField(null=True, blank=True, default=None)
    kind = models.CharField(max_length=20, null=True, blank=True, default=None) # 验证码类型, login: 登录, bind_email: 绑定邮箱, bind_phone: 绑定手机号, bind_execution: 绑定执行层提现地址, bind_consensus: 绑定共识层提现地址
    created_time = models.DateTimeField(auto_now_add=True, blank=True)
    updated_time = models.DateTimeField(auto_now=True, blank=True)

    @classmethod
    def generate_code(self, kind='number', length=6, add_timestamp=False):
        msg = ''
        if kind == 'letter':
            msg = "".join(random.sample(string.ascii_letters + string.digits, length))
        else:
            msg = "{:0>6}".format(random.randint(1, 10**length - 1))

        if add_timestamp:
            msg += str(int(time.time()))
        return msg
