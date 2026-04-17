import logging
from django.core.cache import cache
from validators.notification.notification import Notification, NotificationType
logger = logging.getLogger(__name__)


class CacheUtil(object):

    @classmethod
    def safe_get(cls, key):
        try:
            return cache.get(key)
        except Exception as e:
            logger.error('缓存获取失败, %s', str(e))
            Notification.send_template('handled_exception', {
                                            "msg": e}, notification_type=NotificationType.ALARM_REPORT)
            return None

    @classmethod
    def safe_set(cls, key, value, timeout=None):
        try:
            return cache.set(key, value, timeout)
        except Exception as e:
            logger.error('缓存设置失败, %s', str(e))
            Notification.send_template('handled_exception', {
                                            "msg": e}, notification_type=NotificationType.ALARM_REPORT)
            return False
