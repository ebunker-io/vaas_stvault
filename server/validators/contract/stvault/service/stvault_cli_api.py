import json
import logging
import requests
from django.conf import settings


logger = logging.getLogger(__name__)

CLI_API_URL = settings.STVAULT['cli_api_url']
class StvaultCliApiService(object):

    @classmethod
    def validate_deposits(cls, deposits: list, withdrawal_credentials: str) -> bool:
        try:
            url = f"{CLI_API_URL}/v1/deposits/verify_bls"
            payload = {
                "deposits": deposits,
                "withdrawalCredentials": withdrawal_credentials
            }
            headers = {
                'Content-Type': 'application/json'
            }
            ret = requests.post(url=url, data=json.dumps(payload), headers=headers)
            ret = ret.json()
            return ret["data"]
        except Exception as e:
            logger.error('StvaultCliApiService validate_deposits err %s', str(e))
            return False

    @classmethod
    def get_depositY(cls, deposits: list) -> list:
        try:
            url = f"{CLI_API_URL}/v1/deposits/depositY"
            payload = {
                "deposits": deposits
            }
            headers = {
                'Content-Type': 'application/json'
            }
            ret = requests.post(url=url, data=json.dumps(payload), headers=headers)
            ret = ret.json()
            depositsY = ret["data"]
            return depositsY
        except Exception as e:
            logger.error('StvaultCliApiService get_depositY err %s', str(e))
            return None

    @classmethod
    def get_witnesses(cls, indexes: list) -> list:
        try:
            url = f"{CLI_API_URL}/v1/deposits/witnesses"
            payload = {
                "indexes": indexes
            }
            headers = {
                'Content-Type': 'application/json'
            }
            ret = requests.post(url=url, data=json.dumps(payload), headers=headers)
            ret = ret.json()
            witnesses = ret["data"]
            return witnesses
        except Exception as e:
            logger.error('StvaultCliApiService get_witnesses err %s', str(e))
            return None

    @classmethod
    def get_metrics_data(cls, vault: str, dashboard: str, report_data: dict) -> dict:
        try:
            url = f"{CLI_API_URL}/v1/metrics"
            report_cid = report_data.get('report_cid')
            payload = {
                "vault": vault,
                "dashboard": dashboard,
                "cid": report_cid
            }
            headers = { 'Content-Type': 'application/json' }
            ret = requests.post(url=url, data=json.dumps(payload), headers=headers).json()
            return ret["data"]
        except Exception as e:
            logger.error('StvaultCliApiService get_metrics_data err %s', str(e))
            return None

    @classmethod
    def get_report_proof(cls, vault: str, cid: str) -> dict:
        try:
            url = f"{CLI_API_URL}/v1/report-proof"
            payload = {
                "vault": vault,
                "cid": cid
            }
            headers = { 'Content-Type': 'application/json' }
            ret = requests.post(url=url, data=json.dumps(payload), headers=headers).json()
            return ret["data"]
        except Exception as e:
            logger.error('StvaultCliApiService get_report_proof err %s', str(e))
            return None