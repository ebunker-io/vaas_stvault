import logging
from functools import lru_cache
from typing import Any, Dict, Optional, List
from django.conf import settings
from web3 import Web3
from web3.contract import Contract, ABI
from web3._utils.events import get_event_data


logger = logging.getLogger(__name__)
EL_ENDPOINT = settings.ETH1["endpoint"]
CHAIN_ID = int(settings.ETH.get("chainid"))

@lru_cache(maxsize=1)
def _web3(endpoint: Optional[str] = None) -> Web3:
    """
    生成并缓存 Web3 单例。可通过 endpoint 参数覆盖默认的 ETH1 RPC。
    """
    rpc = endpoint or settings.ETH1["endpoint"]
    return Web3(Web3.HTTPProvider(rpc))


def get_web3() -> Web3:
    """获取 Web3 单例实例。"""
    return _web3(EL_ENDPOINT)

class Web3Tool:
    """
    Web3 单例包装，便于统一管理与扩展。
    """
    _instance: Optional[Web3] = None

    @classmethod
    def instance(cls) -> Web3:
        if cls._instance is None:
            cls._instance = get_web3()
        return cls._instance

    @classmethod
    def set_endpoint(cls, endpoint: str):
        """
        切换 RPC 端点（会重置单例）。
        """
        cls._instance = _web3(endpoint)


    @classmethod
    def estimate_gas(cls, tx: Dict[str, Any]) -> int:
        """
        估算交易 gas，返回整型 gas 数值。
        """
        web3 = cls.instance()
        return web3.eth.estimate_gas(tx)


    @classmethod
    def estimate_gas_hex(cls, tx: Dict[str, Any]) -> str:
        """
        估算交易 gas，返回 0x 开头的十六进制字符串（与 MetaMask 输出一致）。
        """
        return hex(Web3Tool.estimate_gas(tx))


    @classmethod
    def to_wei(cls, value, unit: str = "ether") -> int:
        """
        将指定单位金额转换为 wei。默认按 ether 处理。
        """
        web3 = cls.instance()
        return web3.toWei(value, unit)

    @classmethod
    def format_ether(cls, value: int) -> str:
        """
        将 wei 转换为 ether。
        """
        web3 = cls.instance()
        return web3.fromWei(value, "ether")

    @classmethod
    def to_gwei(cls, value, unit: str = "ether") -> int:
        """
        将指定单位金额转换为 gwei。默认按 ether 处理。
        """
        value = cls.to_wei(value, unit)
        return int(value / 10**9)

    @classmethod
    def is_address(cls, value: int, unit: str = "ether") -> float:
        """
        判断地址是否有效。
        """
        web3 = cls.instance()
        return web3.isAddress(value)

    @classmethod
    def check_address(cls, address: str) -> str:
        """
        将地址转换为校验和地址。
        """
        web3 = cls.instance()
        return web3.toChecksumAddress(address)

    @classmethod
    def decode_bytes32_address(cls, byte32_address: str) -> str:
        """
        将地址转换为 hex地址。
        """
        # 取后40个字符，加0x
        hex_address = cls.to_hex(byte32_address)
        eth_address = "0x" + hex_address[-40:]
        # 可选：checksum 地址
        web3 = cls.instance()
        eth_address = web3.toChecksumAddress(eth_address)
        return eth_address

    @classmethod
    def encode_bytes32_address(cls, address: str) -> str:
        """
        将地址转换为 bytes32。
        """
        web3 = cls.instance()
        bytes32 = web3.toBytes(hexstr=address).rjust(32, b'\x00')
        return web3.toHex(bytes32)

    @classmethod
    def to_hex(cls, value: str) -> str:
        """
        将地址转换为十六进制。
        """
        web3 = cls.instance()
        return web3.toHex(value)

    @classmethod
    def hex_to_bytes(cls, value: str) -> bytes:
        """
        将 0x 前缀的十六进制字符串转换为 bytes。
        前端通常传入形如 "0x..." 或不带 0x 的纯 hex 字符串。
        """
        if value is None:
            return b""
        # 支持 bytes 直接透传
        if isinstance(value, (bytes, bytearray)):
            return bytes(value)
        # 统一转成字符串处理
        s = str(value).strip()
        if s.startswith("0x") or s.startswith("0X"):
            s = s[2:]
        if s == "":
            return b""
        # 长度必须为偶数，否则补一个前导 0
        if len(s) % 2 == 1:
            s = "0" + s
        return bytes.fromhex(s)

    @classmethod
    def contract(cls, address: str, abi: List[Dict[str, Any]]) -> Contract:
        """
        创建合约实例。
        """
        web3 = cls.instance()
        return web3.eth.contract(address=address, abi=abi)

    @classmethod
    def format_tx(cls, from_address: str, to_address: str, value: int, data: str) -> Dict[str, Any]:
        """
        格式化交易。
        """
        return {
            "from": from_address,
            "to": to_address,
            "value": value,
            "data": data,
            "chainId": CHAIN_ID,
        }

    @classmethod
    def parse_event_logs(cls, contract_abi: ABI, tx_hash: str, contract_address: Optional[str] = None) -> Dict[str, Any]:
        """
        解析交易回执中的事件。
        動态解析 logs，根据 ABI 匹配并解码所有事件。
        """
        web3 = cls.instance()
        receipt = web3.eth.get_transaction_receipt(tx_hash)

        if receipt.status != 1:
            raise Exception("Transaction reverted")

        # 提取 ABI 中的 event
        event_abis = [
            abi for abi in contract_abi
            if abi.get("type") == "event"
        ]

        parsed_events = []
        for log in receipt.logs:
            # 可选：只解析指定合约地址
            if contract_address:
                if log["address"].lower() != contract_address.lower():
                    continue

            for event_abi in event_abis:
                try:
                    event_data = get_event_data(
                        web3.codec,
                        event_abi,
                        log
                    )
                    parsed_events.append({
                        "event_name": event_data["event"],
                        "contract_address": log["address"],
                        "event_args": dict(event_data["args"]),
                        "tx_hash": receipt.transactionHash.hex(),
                        "log_index": log["logIndex"],
                    })
                except Exception as e:
                    # log 不匹配该 event，忽略
                    logger.error(f"Failed to parse event {event_abi['name']}: {e}", exc_info=True)
                    continue
        return parsed_events

    # 获取交易日志event
    @classmethod
    def get_logs(cls, from_block: int, to_block: int, topics: List) -> List[Dict[str, Any]]:
        """
        获取交易日志。
        """
        web3 = cls.instance()
        from_block_hex = hex(from_block)
        to_block_hex = hex(to_block)
        filter_params = {
            'fromBlock': from_block_hex,
            'toBlock': to_block_hex,
            'topics': topics
        }
        logs = web3.eth.get_logs(filter_params)
        # 将 AttributeDict 和 HexBytes 转换为可序列化的字典
        result = []
        for log in logs:
            block_timestamp = int(log['blockTimestamp'], 16)
            log_dict = {
                'address': log['address'],
                'topics': log['topics'],
                'data': str(log['data']),
                'tx_hash': log['transactionHash'].hex(),
                'transaction_index': log['transactionIndex'],
                'block_hash': log['blockHash'].hex(),
                'log_index': log['logIndex'],
                'block_number': str(log['blockNumber']),
                'block_timestamp': str(block_timestamp),
                'removed': log['removed']
            }
            result.append(log_dict)
        return result

    @classmethod
    def get_balance_wei(cls, address: str) -> int:
        """
        获取地址余额。
        """
        web3 = cls.instance()
        return web3.eth.get_balance(address)
