from django.http import HttpResponseServerError
from django.middleware.common import CommonMiddleware
from validators.notification.notification import Notification
from validators.notification.notification import NotificationType
import datetime
import logging

logger = logging.getLogger(__name__)


class ExceptionMiddleware(CommonMiddleware):
    def process_exception(self, request, exception):
        logger.error('find unhandled exception')
        logger.warning('request.method: %s', request.method)
        logger.warning('request.path: %s', request.path)
        logger.warning('request ip: %s', request.META.get('REMOTE_ADDR'))
        logger.warning('request META: %s', request.META)
        logger.warning('request.GET: %s', request.GET)
        logger.warning('request.POST: %s', request.POST)
        params = {
            'msg': exception,
            'path': request.path,
            'method': request.method,
            'ip': request.META.get('REMOTE_ADDR'),
            'GET': request.GET,
            'POST': request.POST,
            'time': datetime.datetime.now(),
        }
        Notification.send_template(
            'unhandled_exception', params, notification_type=NotificationType.ALARM_REPORT)
        return None
