import logging
import os
from validators.tool.web3 import Web3Tool
from validators.contract.contract_service import ContractService
from decimal import Decimal
from typing import Union, Optional, Any, List, Dict
from validators.contract.stvault import config
from enum import Enum

logger = logging.getLogger(__name__)

STETH_CONTRACT_ADDRESS = config.STETH_CONTRACT_ADDRESS

class STTokenType(Enum):
    SHARES = 'shares'
    STETH = 'steth'
    WSTETH = 'wsteth'

class STETHContractService:
    steth_abi_path = os.path.join(os.path.dirname(__file__), '..', 'abi', 'steth.json')

    @classmethod
    def checkAllowance(cls, owner: str, spender: str, value_wei: int, token_type: STTokenType) -> str:
        """
        检查并Allowance是否充足。
        """
        if token_type in {STTokenType.STETH, STTokenType.SHARES}:
            # stETH合约
            allowance = cls.allowance(owner, spender)
            amount_shares = value_wei
            if token_type == STTokenType.SHARES:
                amount_shares = cls.get_pooled_eth_by_shares(value_wei)

            if allowance  < amount_shares:
                approve_tx = cls.approve(owner, spender, amount_shares)
                return {"need_approve": True, "approve_tx": approve_tx}
            return {"need_approve": False, "approve_tx": None}
        else:
            raise ValueError(f"Unknown token_type for checkAllowance: {token_type}")












    """
    STETH 合约函数
    """
    @classmethod
    def allowance(cls, owner: str, spender: str) -> Optional[int]:
        owner = Web3Tool.check_address(owner)
        spender = Web3Tool.check_address(spender)
        return ContractService.read_contract(STETH_CONTRACT_ADDRESS, cls.steth_abi_path, "allowance", [owner, spender])

    @classmethod
    def approve(cls, from_address: str, spender: str, amount_wei: int) -> dict:
        spender = Web3Tool.check_address(spender)
        return ContractService.build_contract_tx(cls.steth_abi_path, from_address, STETH_CONTRACT_ADDRESS, "approve", [spender, amount_wei])

    @classmethod
    def get_pooled_eth_by_shares_round_up(cls, value_wei: int) -> int:
        return ContractService.read_contract(STETH_CONTRACT_ADDRESS, cls.steth_abi_path, "getPooledEthBySharesRoundUp", [value_wei])

    @classmethod
    def get_pooled_eth_by_shares(cls, value_wei: int) -> int:
        return ContractService.read_contract(STETH_CONTRACT_ADDRESS, cls.steth_abi_path, "getPooledEthByShares", [value_wei])

    @classmethod
    def get_shares_by_pooled_eth(cls, value_wei: int) -> int:
        return ContractService.read_contract(STETH_CONTRACT_ADDRESS, cls.steth_abi_path, "getSharesByPooledEth", [value_wei])