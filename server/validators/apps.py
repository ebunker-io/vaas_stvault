import logging
from django.apps import AppConfig
from django.db.models.signals import post_migrate

logger = logging.getLogger(__name__)

class ValidatorsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'validators'

    def ready(self):
        post_migrate.connect(app_ready_handler, self)


def app_ready_handler(sender, **kwargs):
    from validators.models.config import Config
    from validators.models.stvault_config import StVaultConfig
    try:
        Config.init_config()
        StVaultConfig.init_default_config()
    except Exception as e:
        logger.error('app_ready_handler error %s' % str(e))
