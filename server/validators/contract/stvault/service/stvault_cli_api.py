import json
import logging
import requests
from django.conf import settings


logger = logging.getLogger(__name__)

CLI_API_URL = settings.STVAULT['cli_api_url']


def _extract_data(method_name: str, payload: dict, ret: dict):
    """
    解析 cli-api 的响应。约定成功时 ret = {'code': 0, 'data': ...}，
    失败时 ret = {'code': 非0, 'error': '描述'}。

    旧实现直接 `return ret["data"]`，错误响应里没有 data 键就抛 KeyError 'data'，
    被外层 except 当成普通异常 log 出来，真正的 error 字符串就丢了 ——
    问题就是看 log 看不到底层为什么失败（是 vault 不在 report 里？还是
    archive 节点拿不到历史 state？还是 8100 服务挂了？）。
    """
    if not isinstance(ret, dict):
        logger.error("StvaultCliApiService %s unexpected response shape: %r (payload=%s)", method_name, ret, payload)
        return None
    if ret.get('code') == 0 and 'data' in ret:
        return ret['data']
    logger.error(
        "StvaultCliApiService %s failed: code=%s error=%r payload=%s",
        method_name, ret.get('code'), ret.get('error'), payload,
    )
    return None


class StvaultCliApiService(object):

    @classmethod
    def validate_deposits(cls, deposits: list, withdrawal_credentials: str) -> bool:
        url = f"{CLI_API_URL}/v1/deposits/verify_bls"
        payload = {
            "deposits": deposits,
            "withdrawalCredentials": withdrawal_credentials
        }
        try:
            ret = requests.post(url=url, data=json.dumps(payload), headers={'Content-Type': 'application/json'}).json()
        except Exception as e:
            logger.error('StvaultCliApiService validate_deposits request err: %s', e)
            return False
        data = _extract_data('validate_deposits', payload, ret)
        return data if data is not None else False

    @classmethod
    def get_depositY(cls, deposits: list) -> list:
        url = f"{CLI_API_URL}/v1/deposits/depositY"
        payload = {"deposits": deposits}
        try:
            ret = requests.post(url=url, data=json.dumps(payload), headers={'Content-Type': 'application/json'}).json()
        except Exception as e:
            logger.error('StvaultCliApiService get_depositY request err: %s', e)
            return None
        return _extract_data('get_depositY', payload, ret)

    @classmethod
    def get_witnesses(cls, indexes: list) -> list:
        url = f"{CLI_API_URL}/v1/deposits/witnesses"
        payload = {"indexes": indexes}
        try:
            ret = requests.post(url=url, data=json.dumps(payload), headers={'Content-Type': 'application/json'}).json()
        except Exception as e:
            logger.error('StvaultCliApiService get_witnesses request err: %s', e)
            return None
        return _extract_data('get_witnesses', payload, ret)

    @classmethod
    def get_metrics_data(cls, vault: str, dashboard: str, report_data: dict) -> dict:
        url = f"{CLI_API_URL}/v1/metrics"
        payload = {
            "vault": vault,
            "dashboard": dashboard,
            "cid": report_data.get('report_cid'),
        }
        try:
            ret = requests.post(url=url, data=json.dumps(payload), headers={'Content-Type': 'application/json'}).json()
        except Exception as e:
            logger.error('StvaultCliApiService get_metrics_data request err: %s', e)
            return None
        return _extract_data('get_metrics_data', payload, ret)

    @classmethod
    def get_report_proof(cls, vault: str, cid: str) -> dict:
        url = f"{CLI_API_URL}/v1/report-proof"
        payload = {"vault": vault, "cid": cid}
        try:
            ret = requests.post(url=url, data=json.dumps(payload), headers={'Content-Type': 'application/json'}).json()
        except Exception as e:
            logger.error('StvaultCliApiService get_report_proof request err: %s', e)
            return None
        return _extract_data('get_report_proof', payload, ret)