

import logging
import os
import json
from validators.tool.web3 import Web3Tool
from web3.contract import Contract, ABI
from web3.types import ABIEvent, ABIFunction
from typing import Any, Optional, List

logger = logging.getLogger(__name__)

class ContractService:
    # 获取 ABI
    @classmethod
    def get_abi(cls, abi_path: str) -> ABI:
        with open(abi_path, 'r') as f:
            abi = json.load(f)
            return abi


    # 获取 Dashboard 合约ABI
    @classmethod
    def get_contract(cls, contract_address: str, abi_path: str) -> Contract:
        isAddress = Web3Tool.is_address(contract_address)
        if not isAddress:
            raise ValueError(f"Invalid contract address: {contract_address}")
        checksum_contract = Web3Tool.check_address(contract_address)
        with open(abi_path, 'r') as f:
            abi_json = json.load(f)
            # 转换为校验和地址
            contract = Web3Tool.contract(checksum_contract, abi_json)
            return contract

    # ===== 通用只读合约函数 =====
    @classmethod
    def read_contract(cls, contract_address: str, abi_path: str, fn_name: str, args: List[Any] = []) -> Any:
        """
        无参 view 函数调用，简化重复逻辑。
        """
        try:
            contract = cls.get_contract(contract_address, abi_path)
            fn = getattr(contract.functions, fn_name)
            return fn(*args).call()
        except Exception as exc:  # pylint: disable=broad-except
            logger.error("call contract.%s failed: %s", fn_name, exc)
            raise Exception(f'Contract request is failed: {fn_name}')

    # ===== 合约交易构造 =====
    @classmethod
    def build_contract_tx(
        cls,
        abi_path: str,
        from_address: [str],
        contract_address: str,
        fn_name: str,
        args: List[Any],
        value_wei: int = 0,
    ) -> dict:
        contract = cls.get_contract(contract_address, abi_path)
        from_addr = Web3Tool.check_address(from_address)
        data = contract.encodeABI(fn_name=fn_name, args=args)
        tx = Web3Tool.format_tx(from_addr, contract.address, value_wei, data)
        # gas = Web3Tool.estimate_gas(tx)
        # tx["gasLimit"] = gas
        return tx