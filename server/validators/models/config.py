import logging
import json
from django.db import models
from enum import Enum
from django.conf import settings

logger = logging.getLogger(__name__)


class Config(models.Model):
    def __str__(self):
        return self.key

    class ConfigValueType(Enum):
        string = '字符串'
        int = '整数'
        array = '列表'
        hash = '字典'

        @classmethod
        def choices(cls):
            return tuple((i.name, i.value) for i in cls)

    key = models.CharField(max_length=200, null=False, unique=True)
    value_type = models.CharField(max_length=20, choices=ConfigValueType.choices(), null=True, blank=True)
    value = models.TextField(null=True, blank=True)
    remark = models.TextField(null=True, blank=True)
    created_time = models.DateTimeField(auto_now_add=True, blank=True)
    updated_time = models.DateTimeField(auto_now=True, blank=True)

    @classmethod
    def init_config(cls):
        cons = settings.APP_CONFIG
        for con in cons:
            logger.info('init config')
            conf = Config.objects.filter(key=con['key'])
            if not len(conf):
                new_con = Config(key=con['key'], value=con['value'], value_type=con['value_type'], remark=con['remark'])
                new_con.save()
            else:
                logger.warning('warning: config key: %s value: %s exist' % (conf[0].key, conf[0].value))


    @classmethod
    def get_by_key(cls, key, default=None):
        """
        获取一个配置
        :param key: 配置的名字
        :param default: 未查询到配置时，返回的默认值
        """
        items = cls.objects.filter(key=key)
        if not items:
            return default
        if items[0].value_type in ['array', 'hash']:
            return json.loads(items[0].value)
        if items[0].value_type in ['int']:
            return int(items[0].value)
        return items[0].value

    @classmethod
    def set_by_key(cls, key, value, value_type):
        """
        设置config
        :param key: 配置的名字
        :param value: 配置的值
        :param value_type: 配置的类型
        """
        s_value = value
        items = cls.objects.filter(key=key)
        if value_type not in ['string', 'int', 'array', 'hash']:
            raise "unformated value_type"
        if value_type in ['array', 'hash']:
            s_value = json.dumps(value, ensure_ascii=False)
        if not items:
            cls.objects.create(
                key=key,
                value_type=value_type,
                value=s_value
            )
            return
        item = items[0]
        item.value_type=value_type
        item.value=s_value
        item.save()
