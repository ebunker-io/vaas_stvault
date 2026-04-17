import logging
import json
import jwt
import time
import re
import requests
from eth_account import Account
from eth_account.messages import encode_defunct
from django.conf import settings
from functools import reduce
from decimal import Decimal
from validators.models import Config, Customer, Observer, PoolId
from rest_framework.response import Response
from rest_framework import status
from apis.results import Result
from apis.util import ValidateDepositKey
from django.core.cache import cache
from validators.notification.notification import Notification
from validators.notification.notification import NotificationType

import hashlib
logger = logging.getLogger(__name__)


def generate_jwt_auth_token(address, pool_name):
    """
    生成jwt
    :param address: 钱包地址
    :param expires_in: 有效时间(s)
    :param pool_id 矿池id name
    """
    expires_in = int(Config.get_by_key('token_expires_in', 6000))
    return jwt.encode(
        {'address': address, 'exp': time.time() + expires_in, 'pool_name': pool_name},
        settings.JWT['SECRET_KEY'], algorithm='HS256')


def verify_jwt_auth_token(encoded_jwt):
    """
    Verify JWT signature, algorithm, and expiration.
    Returns the decoded payload on success, False otherwise.

    PyJWT's decode() verifies the signature, rejects tokens with unexpected
    algorithms (thwarting alg=none / HS256<->RS256 confusion attacks), and
    enforces the `exp` claim when require=['exp'] is set.
    """
    if not encoded_jwt:
        return False
    try:
        return jwt.decode(
            encoded_jwt,
            settings.JWT['SECRET_KEY'],
            algorithms=["HS256"],
            options={"require": ["exp"]},
        )
    except jwt.ExpiredSignatureError:
        logger.info("JWT expired")
    except jwt.InvalidSignatureError:
        logger.warning("JWT signature mismatch")
    except jwt.InvalidAlgorithmError:
        logger.warning("JWT unexpected algorithm")
    except jwt.InvalidTokenError as e:
        logger.warning("JWT invalid: %s", e)
    return False


def verifity_sign(text, signature, address):
    """
    Verify that `signature` over `text` recovers to `address`.
    Malformed signatures raise a variety of exceptions (ValueError,
    eth_keys.exceptions.BadSignature, BinasciiError, etc.); treat them
    all as "verification failed" but log so the cause is visible.
    """
    try:
        message = encode_defunct(text=text)
        recovered = Account.recover_message(message, signature=signature)
    except Exception as e:
        logger.warning("Signature verification failed: %s: %s", type(e).__name__, e)
        return False
    return recovered.lower() == address.lower()


def verify_params(params, arr):
    """
    验证参数齐全
    :param params: 参数
    :param arr: 需要验证的参数数组
    """
    return reduce(lambda x, y: x and y, map(lambda x: params.get(x) != None, arr))


def sum_gas_fee_of(address):
    """
    统计某地址获取的总gas fee
    """
    reward = Decimal(0)
    try:
        url = "%s/api?module=account&action=getminedblocks&address=%s&blocktype=blocks&apikey=%s&chainid=%s" % (
            settings.ETH['api_url'], address, settings.ETH['api_key'], settings.ETH['chainid'])
        ret = requests.get(url).json()
        if ret['status'] == '1':
            for tx in ret['result']:
                reward = reward + Decimal(tx['blockReward'])

        return reward / Decimal(1e18)
    except Exception as e:
        logger.error("eth_fee unclaimed_reward err%s", str(e))
        Notification.send_template('handled_exception', {"msg": e}, notification_type=NotificationType.ALARM_REPORT)
        return reward
    return None


def get_current_slot():
    """
    获取当前slot
    """
    url = "%s/eth/v1/node/syncing" % (settings.ETH2['endpoint'])
    headers = {'content-type': 'application/json'}
    try:
        res = requests.get(url, headers=headers).json()
        if res['data']:
            return int(res['data']['head_slot'])
    except Exception as e:
        logger.error("eth get_current_slot err%s", str(e))
        Notification.send_template('handled_exception', {"msg": e}, notification_type=NotificationType.ALARM_REPORT)
    return False


def verify_deposit_datas_for_validators(deposit_datas, pubkeys, reward_address):
    """
    验证deposit_data完整性
    :param deposit_datas: deposit_data数组
    :param pubkeys: 需要验证存在的pubkey数组
    """
    for pubkey in pubkeys:
        if len([data for data in deposit_datas if data['pubkey'] == pubkey]) != 1:
            return False
    return True
    # return ValidateDepositKey.validator_deposit_key(deposit_datas, reward_address)


def verify_token(request, allow_observer=False):
    """
    登录验证, 返回用户
    :param request: http请求
    """
    headers: dict = request.headers
    current_user = None
    language = headers.get('Accept-Language') or 'en'

    # 支持观察者验证码
    items: dict = request.GET
    observer = None
    pool_id = None
    if allow_observer and items.get('observer_token'):
        observer = Observer.objects.filter(code=items.get('observer_token')).first()
        if observer:
            current_user = {
                'address': observer.customer.reward_address,
                'pool_id': observer.customer.pool_id
            }
            pool_id = observer.customer.pool_id
        logger.info('observer %s', current_user)
    else:
        current_user = verify_jwt_auth_token(
            headers.get('Authorization'))
        if not current_user:
            result = Result(code=401, msg=Result.get_msg('invalid_token', language, []), success=False)
            return Response(result.__dict__, status=status.HTTP_401_UNAUTHORIZED, content_type="application/json")
        logger.info('current_user %s', current_user)
        pool_name_in_token = current_user.get('pool_name')
        pool_name = headers.get('Pool-Id')
        if not pool_name:
            pool_name = 'ebunker'
        # 对比jwt token中的pool-id和请求头中的pool-id , header中无pool-id，则默认为ebunker
        if pool_name_in_token != pool_name:
            result = Result(code=401,
                            msg=Result.get_msg('invalid_token', request.headers.get('Accept-Language') or 'en',
                                               ['pool-id']), success=False)
            return Response(result.__dict__, status=status.HTTP_401_UNAUTHORIZED, content_type="application/json")

        pool_id = PoolId.objects.filter(name=pool_name.lower()).first()
        if not pool_id:
            result = Result(code=401,
                            msg=Result.get_msg('invalid_token', request.headers.get('Accept-Language') or 'en',
                                               ['pool-id']),
                            success=False)
            return Response(result.__dict__, status=status.HTTP_401_UNAUTHORIZED, content_type="application/json")
    if not current_user:
        result = Result(code=401, msg=Result.get_msg('invalid_token', language, []), success=False)
        return Response(result.__dict__, status=status.HTTP_401_UNAUTHORIZED, content_type="application/json")
    current_user = Customer.objects.filter(
        reward_address=current_user['address'], pool_id=pool_id).first()
    logger.info('current_user111 %s', current_user)
    logger.info('request ip: %s', request.META.get('REMOTE_ADDR'))
    if not current_user:
        result = Result(code=401, msg=Result.get_msg('invalid_token', language, []), success=False)
        return Response(result.__dict__, status=status.HTTP_401_UNAUTHORIZED, content_type="application/json")

    captcha = current_user.captcha_set.filter(kind='login', expired_at__gte=time.time()).first()
    if not captcha:
        result = Result(code=401, msg=Result.get_msg('invalid_token', language, []), success=False)
        return Response(result.__dict__, status=status.HTTP_401_UNAUTHORIZED, content_type="application/json")

    if not observer and (
            not request.META.get('HTTP_USER_AGENT') or current_user.agent != request.META.get('HTTP_USER_AGENT')):
        logger.info('current_user2 %s 2: %s', current_user.agent,request.META.get('HTTP_USER_AGENT'))
        result = Result(code=401, msg=Result.get_msg('invalid_token', language, []), success=False)
        return Response(result.__dict__, status=status.HTTP_401_UNAUTHORIZED, content_type="application/json")
    logger.info("%s, %s", current_user.agent, request.META['HTTP_USER_AGENT'])
    return current_user

def clean_cache(keys=[]):
    """
    删除缓存，在数据更新时触发
    :param keys: 待删缓存key数组
    """
    try:
        for key in keys:
            cache.delete(key)
        return True
    except Exception as e:
        logger.error("clean cache err%s", str(e))
        Notification.send_template('handled_exception', {"msg": e}, notification_type=NotificationType.ALARM_REPORT)
    return False

def get_md5(origin: str):
    m = hashlib.md5()
    m.update(origin.encode())
    return m.hexdigest()

def validate_password(password):
    # 使用正则表达式匹配密码要求：长度至少为6，包含字母和数字
    pattern = r"^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$"

    if re.match(pattern, password):
        return True
    else:
        return False


def email_valid(email: str):
    pattern = r"^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$"
    return re.match(pattern, email)
