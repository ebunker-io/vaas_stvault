

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
        # 估算 gas 并写入 tx，加 20% buffer：估算时与打包时的链上状态可能不同
        # （fee 累计 / rebalance / oracle 数据更新都会让实际消耗高于估算），
        # 不留余量会导致钱包签名后 on-chain revert，对用户来说是无声失败。
        #
        # 估算失败原因有两类：
        #   (a) 该 tx 在当前 state 下确实就会 revert（业务校验失败），
        #   (b) 该 tx 依赖前序 tx 的 state（如串行调用中前一笔 approve/oracle report
        #       还没上链，模拟时 allowance/oracle 还是旧值），是预期内的失败。
        # 后端无法分辨二者，因此采用"尽力而为"：估算成功就写入，失败仅 warn，
        # 让钱包在签名前自己估（此时前序 tx 通常已进入 mempool，钱包估算更准）。
        try:
            estimated_gas = Web3Tool.estimate_gas(tx)
            tx["gas"] = int(estimated_gas) * 12 // 10
        except Exception as exc:
            logger.warning(
                "estimate_gas failed for %s on %s: %s (falling back to wallet estimation)",
                fn_name, contract_address, exc,
            )
        return tx