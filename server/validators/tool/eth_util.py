import time
from web3 import Web3
from django.conf import settings


web3 = Web3(Web3.HTTPProvider(settings.ETH1["endpoint"]))

class ETHUtil:

    @classmethod
    def calculate_fee(cls):
        # ===== 获取 EIP-1559 相关费率 =====
        # 当前 base fee (latest block)
        latest_block = self.w3.eth.get_block("latest")
        base_fee = latest_block.get("baseFeePerGas")

        # 建议 priority fee
        maxFeePerGas = web3.eth.max
        maxPriorityFeePerGas = web3.eth.max_priority_fee

        # maxFeePerGas = baseFeePerGas * 2 + priorityFee
        # （常见估算方式）
        max_fee_per_gas = base_fee * 2 + priority_fee

        return fee_data