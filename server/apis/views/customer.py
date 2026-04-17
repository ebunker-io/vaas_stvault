import logging
import time
import django.utils.timezone as timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apis.results import Result
from apis import utils
from django.forms.models import model_to_dict
from validators.models import Customer
from validators.tool.address_util import AddressUtil
from validators.notification.notification import Notification


logger = logging.getLogger(__name__)


class CustomerBindEmailApiView(APIView):
    def get(self, request, *args, **kwargs):
        current_user = utils.verify_token(request)
        if not isinstance(current_user, Customer):
            return current_user

        items: dict = request.GET
        if not utils.verify_params(items, ['code']):
            result = Result(code=400, msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en', ['code'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

        captcha = current_user.captcha_set.filter(
            code=items['code'], kind="bind_email", expired_at__gte=time.time()).first()
        if not captcha or not captcha.customer.verifying_email:
            result = Result(code=400, msg=Result.get_msg('invalid_captcha', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        captcha.customer.email_verified_at = timezone.now()
        captcha.customer.email = captcha.customer.verifying_email
        captcha.customer.verifying_email = None
        captcha.customer.save()
        captcha.delete()
        result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data={})
        return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")


class CustomerMyInfoApiView(APIView):
    def get(self, request, *args, **kwargs):
        current_user = utils.verify_token(request)
        if not isinstance(current_user, Customer):
            return current_user
        data = model_to_dict(current_user,
                             fields=['email', 'email_verified_at', 'phone',
                                     'phone_verified_at', 'name', 'remark', 'reward_address', 'execution_withdraw_address', 'consensus_withdraw_address'])
        data['pool_id'] = current_user.pool_id.name
        observer = current_user.observer_set.all().first()
        data['observer_token'] = observer.code if observer else None
        result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data=data)
        return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

    def put(self, request, *args, **kwargs):
        current_user = utils.verify_token(request)
        if not isinstance(current_user, Customer):
            return current_user

        items: dict = request.data
        if not utils.verify_params(items, ['name']):
            result = Result(code=400, msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en', ['name'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        current_user.name = items['name']
        current_user.save()

        result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data="update successful")
        return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")


class CustomerRewardAddressApiView(APIView):

    def get(self, request, *args, **kwargs):
        current_user = utils.verify_token(request, allow_observer=True)
        if not isinstance(current_user, Customer):
            return current_user
        data = {
            'reward_address': current_user.reward_address
        }
        result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data=data)
        return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

    def post(self, request, *args, **kwargs):
        current_user = utils.verify_token(request)
        if not isinstance(current_user, Customer):
            return current_user

        items: dict = request.data
        if not utils.verify_params(items, ['captcha', 'sign', 'address', 'kind']) or items['kind'] not in ['execution', 'consensus']:
            result = Result(code=400, msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en', ['captcha', 'sign', 'address', 'kind'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        if not current_user.verify_captcha(items['captcha'], "bind_{}".format(items['kind'])):
            result = Result(code=400, msg=Result.get_msg('invalid_captcha', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

        if items['captcha'].count(AddressUtil.address_add_0x_and_lower(items['address'])) < 1:
            result = Result(code=400, msg=Result.get_msg('invalid_captcha', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

        if not utils.verifity_sign(items['captcha'], items['sign'], current_user.reward_address):
            result = Result(code=400, msg=Result.get_msg('invalid_captcha', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

        current_user.captcha_set.filter(kind="bind_{}".format(items['kind'])).delete()
        params = {
            "kind": items['kind'],
            "reward_address": current_user.reward_address,
            "to": AddressUtil.address_add_0x_and_lower(items['address']),
        }
        if items['kind'] == 'execution':
            params['from'] = current_user.execution_withdraw_address
            current_user.execution_withdraw_address = AddressUtil.address_add_0x_and_lower(items['address'])
        elif items['kind'] == 'consensus':
            params['from'] = current_user.consensus_withdraw_address
            current_user.consensus_withdraw_address = AddressUtil.address_add_0x_and_lower(items['address'])
        current_user.save()

        Notification.send_template('update_address', params)

        result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data="update successful")
        return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
