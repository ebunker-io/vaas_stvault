import logging
from django.conf import settings
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from django.core.management.base import BaseCommand
from django_apscheduler.jobstores import DjangoJobStore

from validators.contract.stvault.service.task import StVaultTask

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Runs APScheduler."

    def handle(self, *args, **options):
        scheduler = BlockingScheduler(timezone=settings.TIME_ZONE)
        scheduler.add_jobstore(DjangoJobStore(), "default")

        scheduler.add_job(
            StVaultTask.stvault_event_task,
            trigger=CronTrigger(second="*/12"),
            id="StVaultEventTask_set_node_operator_event",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job 'StVaultEventTask.set_node_operator_event'.")

        scheduler.add_job(
            StVaultTask.refresh_all_success_vaults,
            trigger=CronTrigger(hour="*/1"),
            id="StVaultTask_refresh_all_success_vaults",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job 'StVaultTask.refresh_all_success_vaults'.")

        scheduler.add_job(
            StVaultTask.update_staking_apr,
            trigger=CronTrigger(hour="*/8"),
            id="StVaultTask_update_staking_apr",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job 'StVaultTask.update_staking_apr'.")

        scheduler.add_job(
            StVaultTask.check_low_health_factor,
            trigger=CronTrigger(day="*", hour=9, minute=10),
            id="StVaultTask_check_low_health_factor",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job 'StVaultTask.check_low_health_factor'.")

        scheduler.add_job(
            StVaultTask.check_high_balance_vaults,
            trigger=CronTrigger(day="*", hour=9, minute=45),
            id="StVaultTask_check_high_balance_vaults",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job 'StVaultTask.check_high_balance_vaults'.")

        scheduler.add_job(
            StVaultTask.daily_statistics,
            trigger=CronTrigger(day="*", hour=0, minute=2),
            id="StVaultTask_daily_statistics",
            max_instances=1,
            replace_existing=True,
        )
        logger.info("Added job 'StVaultTask.daily_statistics'.")

        try:
            logger.info("Starting scheduler...")
            scheduler.start()
        except KeyboardInterrupt:
            logger.info("Stopping scheduler...")
            scheduler.shutdown()
            logger.info("Scheduler shut down successfully!")
