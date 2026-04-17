from validators.tool.request import Request
from django.conf import settings

el_endpoint = settings.ETH1["endpoint"]


# class EthGas(object):
#     @classmethod
#     def estimate_eth_gas(cls, tx):
#         return web3.eth.estimate_gas(tx)
