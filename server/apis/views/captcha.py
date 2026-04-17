import logging
import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apis.results import Result
from apis import utils
from django.db import transaction
from validators.models import Captcha, Customer, PoolId
from validators.tool.address_util import AddressUtil
from validators.tool.cache_util import CacheUtil
from validators.notification.notification import Notification
from validators.notification.notification import NotificationType

logger = logging.getLogger(__name__)


class CaptchaApiView(APIView):
    def post(self, request, *args, **kwargs):
        items: dict = request.data
        if not utils.verify_params(items, ['address']) or items['address'] == '' or not re.match("^0x[a-fA-F0-9]{40}$", items['address']):
            result = Result(code=400, msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en', ['address'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        headers: dict = request.headers
        pool_name = headers.get('Pool-Id')
        if not pool_name:
            pool_name = 'ebunker'
        pool_id = PoolId.objects.filter(name=pool_name.lower()).first()
        if not pool_id:
            result = Result(code=400, msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en', ['pool-id'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        customer = Customer.objects.filter(
            reward_address=items['address'], pool_id=pool_id).first()
        if not customer:
            customer = Customer.objects.create(
                reward_address=AddressUtil.address_add_0x_and_lower(items['address']),
                execution_withdraw_address=AddressUtil.address_add_0x_and_lower(items['address']),
                consensus_withdraw_address=AddressUtil.address_add_0x_and_lower(items['address']),
                pool_id=pool_id,
                fee_commission=0,
                mev_commission=0,
                enjoy_promote=True,
            )

        data = {
            "code": customer.get_captcha('login').code,
        }
        result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data=data)
        return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")


class EmailCaptchaApiView(APIView):
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        current_user = utils.verify_token(request)
        if not isinstance(current_user, Customer):
            return current_user

        items: dict = request.data
        if not utils.verify_params(items, ['email']):
            result = Result(code=400, msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en', ['email'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        pattern = r"^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$"
        email_match = re.match(pattern, items['email'])
        if not email_match:
            result = Result(code=400, msg=Result.get_msg('invalid_email', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

        cache_key = "{}__{}".format('send_bind_email', current_user.reward_address)
        if CacheUtil.safe_get(cache_key):
            result = Result(code=400, msg=Result.get_msg('too_many_requests', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        try:
            sid = transaction.savepoint()
            current_user.verifying_email = items['email']
            current_user.save()
            current_user.captcha_set.filter(kind='bind_email').delete()
            if current_user.get_captcha('bind_email'):
                CacheUtil.safe_set(cache_key, 1, 120)
                result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data={})
                return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        except Exception as e:
            logger.error('send_email fail, %s', str(e))
            transaction.savepoint_rollback(sid)
            Notification.send_template('handled_exception', {"msg": e}, notification_type=NotificationType.ALARM_REPORT)
            result = Result(code=500, msg=Result.get_msg('send_email_fail', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")


class WithdrawAddressCaptchaApiView(APIView):
    def post(self, request, *args, **kwargs):
        current_user = utils.verify_token(request)
        if not isinstance(current_user, Customer):
            return current_user

        items: dict = request.data
        pattern = "^0x[a-fA-F0-9]{40}$"
        address_match = re.match(pattern, items.get('address', ''))
        if not utils.verify_params(items, ['address', 'kind']) or items['address'] == '' or items['kind'] not in ['execution', 'consensus'] or not address_match:
            result = Result(code=400, msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en', ['address, kind'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

        data = {
            "code": current_user.get_captcha("bind_{}".format(items['kind']), {"address": AddressUtil.address_add_0x_and_lower(items['address'])}).code,
        }
        result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data=data)
        return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
