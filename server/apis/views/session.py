import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apis.results import Result, Failure
from validators.models import Customer, PoolId
from apis import utils
from validators.tool.address_util import AddressUtil


class SessionApiView(APIView):
    def post(self, request, *args, **kwargs):
        items: dict = request.data
        if not utils.verify_params(items, ['captcha', 'sign', 'address']):
            result = Result(code=400, msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en', ['captcha', 'sign', 'address'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        headers: dict = request.headers
        pool_name = headers.get('Pool-Id')
        if not pool_name:
            pool_name = 'ebunker'
        pool_id = PoolId.objects.filter(name=pool_name.lower()).first()
        logging.info('pool_id %s', pool_id)
        if not pool_id:
            result = Result(code=400,
                            msg=Result.get_msg('invalid_params', request.headers.get('Accept-Language') or 'en',
                                               ['pool-id'], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        customer = Customer.objects.filter(reward_address=AddressUtil.address_add_0x_and_lower(items['address']),
                                           pool_id=pool_id).first()
        logging.info('customer %s', customer)
        if not customer:
            result = Result(code=400, msg=Result.get_msg('invalid_captcha', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

        if not customer.verify_captcha(items['captcha']):
            result = Result(code=400, msg=Result.get_msg('invalid_captcha', request.headers.get('Accept-Language') or 'en', [], request), success=False)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")

        if utils.verifity_sign(items['captcha'], items['sign'], AddressUtil.address_add_0x_and_lower(items['address'])):
            data = {
                "token": utils.generate_jwt_auth_token(address=AddressUtil.address_add_0x_and_lower(items['address']),
                                                       pool_name=pool_id.name),
                "customer": {
                    "name": customer.name,
                    "email": customer.email,
                }
            }

            customer.agent = request.META['HTTP_USER_AGENT']
            customer.save()

            if not customer.is_login:
                customer.is_login = True
                customer.save()

            result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True, data=data)
            return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
        else:
            return Response(Failure.__dict__, status=status.HTTP_401_UNAUTHORIZED, content_type="application/json")

    def delete(self, request, *args, **kwargs):
        current_user = utils.verify_token(request)
        if not isinstance(current_user, Customer):
            return current_user

        current_user.captcha_set.filter(kind='login').delete()

        result = Result(code=200, msg=Result.get_msg('success', request.headers.get('Accept-Language') or 'en', []), success=True)
        return Response(result.__dict__, status=status.HTTP_200_OK, content_type="application/json")
