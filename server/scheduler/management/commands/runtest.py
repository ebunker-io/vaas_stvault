import logging
from django.core.management.base import BaseCommand
from validators.contract.stvault.service.vault import VaultContractService
from validators.contract.stvault.service.vaulthub import VaultHubContractService
from validators.contract.stvault.service.task import StVaultTask
from validators.notification.notification import Notification, NotificationType





logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Runs APScheduler."

    def handle(self, *args, **options):
        # pass
        StVaultTask.check_low_health_factor()