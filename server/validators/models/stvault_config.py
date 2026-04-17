import logging
from django.db import models
from django.conf import settings

logger = logging.getLogger(__name__)


class StVaultConfig(models.Model):
    """
    StVault 配置表
    存储 StVault 相关的配置参数
    """

    def __str__(self):
        return f"{self.key} = {self.value}"

    key = models.CharField(max_length=100, unique=True, help_text='配置键名')
    value = models.CharField(max_length=500, help_text='配置值')
    remark = models.TextField(null=True, blank=True, help_text='备注说明')
    created_time = models.DateTimeField(auto_now_add=True, blank=True)
    updated_time = models.DateTimeField(auto_now=True, blank=True)

    class Meta:
        db_table = 'stvault_config'
        verbose_name = 'StVault配置'
        verbose_name_plural = 'StVault配置'

    @classmethod
    def get_value(cls, key: str, default=None):
        """
        获取配置值
        :param key: 配置键名
        :param default: 默认值
        :return: 配置值（字符串）
        """
        try:
            config = cls.objects.filter(key=key).first()
            if config:
                return config.value
            return default
        except Exception as e:
            logger.error(f"获取StVault配置失败: {key}, 错误: {e}")
            return default

    @classmethod
    def get_int_value(cls, key: str, default=0):
        """
        获取整数配置值
        :param key: 配置键名
        :param default: 默认值
        :return: 配置值（整数）
        """
        value = cls.get_value(key, default)
        try:
            return int(value) if value else default
        except (ValueError, TypeError):
            logger.warning(f"配置值无法转换为整数: {key} = {value}")
            return default

    @classmethod
    def set_value(cls, key: str, value, remark=None):
        """
        设置配置值
        :param key: 配置键名
        :param value: 配置值（会自动转换为字符串）
        :param remark: 备注说明
        """
        try:
            config = cls.objects.filter(key=key).first()
            str_value = str(value)
            if config:
                config.value = str_value
                if remark:
                    config.remark = remark
                config.save(update_fields=['value', 'remark', 'updated_time'])
            else:
                cls.objects.create(
                    key=key,
                    value=str_value,
                    remark=remark or ''
                )
        except Exception as e:
            logger.error(f"设置StVault配置失败: {key} = {value}, 错误: {e}")

    @classmethod
    def init_default_config(cls):
        """
        初始化默认配置
        """
        from validators.contract.stvault import config as stvault_config_module

        # 根据网络环境获取默认值
        network = settings.BACKEND.get("network", "").lower()
        if network == "mainnet":
            defaults = {
                'IS_PAUSED': '0',
                'CONFIRM_EXPIRY': '129600',
                'FEE_BPS': '350',
                'CREATE_DEFAULT_VALUE': '1',
                'OPERATOR_ADDRESS': '0x3ED6d85Fc06becE41A9EDB13658F50180eC9F942',
                'OPERATOR_MANAGER_ADDRESS': '0x3ED6d85Fc06becE41A9EDB13658F50180eC9F942',
            }
        else:
            defaults = {
                'IS_PAUSED': '0',
                'CONFIRM_EXPIRY': '129600',
                'FEE_BPS': '350',
                'CREATE_DEFAULT_VALUE': '1',
                'OPERATOR_ADDRESS': '0x3ED6d85Fc06becE41A9EDB13658F50180eC9F942',
                'OPERATOR_MANAGER_ADDRESS': '0x3ED6d85Fc06becE41A9EDB13658F50180eC9F942',
            }

        for key, value in defaults.items():
            if not cls.objects.filter(key=key).exists():
                cls.objects.create(
                    key=key,
                    value=value,
                    remark=f'默认配置（{network}网络）'
                )
                logger.info(f"初始化StVault配置: {key} = {value}")
