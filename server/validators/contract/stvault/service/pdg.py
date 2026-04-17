import logging
import os
from validators.tool.web3 import Web3Tool
from validators.contract.contract_service import ContractService
from decimal import Decimal
from typing import Union, Optional, Any, List, Dict
from validators.contract.stvault import config
from web3 import Web3


logger = logging.getLogger(__name__)
PDG_CONTRACT_ADDRESS = config.PDG_CONTRACT_ADDRESS


class PDGContractService:
    pdg_abi_path = os.path.join(os.path.dirname(__file__), '..', 'abi', 'pdg.json')

    """
    读合约
    """
    @classmethod
    def predeposit_amount(cls) -> int:
        return ContractService.read_contract(PDG_CONTRACT_ADDRESS, cls.pdg_abi_path, "PREDEPOSIT_AMOUNT", [])


    @classmethod
    def is_paused(cls) -> bool:
        return ContractService.read_contract(PDG_CONTRACT_ADDRESS, cls.pdg_abi_path, "isPaused", [])




    """
    写合约
    """
    @classmethod
    def set_guarantor(cls, from_address: str, guarantor: str) -> dict:
        guarantor = Web3Tool.check_address(guarantor)
        return ContractService.build_contract_tx(
            cls.pdg_abi_path,
            from_address,
            PDG_CONTRACT_ADDRESS,
            "setNodeOperatorGuarantor",
            [guarantor],
        )

    @classmethod
    def set_depositor(cls, from_address: str, depositor: str) -> dict:
        depositor = Web3Tool.check_address(depositor)
        return ContractService.build_contract_tx(cls.pdg_abi_path, from_address, PDG_CONTRACT_ADDRESS, "setNodeOperatorDepositor", [depositor])

    @classmethod
    def top_up_node_operator_balance(cls, from_address: str, node_operator: str, value_wei: int = 0) -> dict:
        node_operator = Web3Tool.check_address(node_operator)
        return ContractService.build_contract_tx(cls.pdg_abi_path, from_address, PDG_CONTRACT_ADDRESS, "topUpNodeOperatorBalance", [node_operator], value_wei=value_wei)

    @classmethod
    def predeposit(cls, from_address: str, staking_vault: str, deposits: list, depositsY: list) -> dict:
        staking_vault = Web3Tool.check_address(staking_vault)
        return ContractService.build_contract_tx(cls.pdg_abi_path, from_address, PDG_CONTRACT_ADDRESS, "predeposit", [staking_vault, deposits, depositsY])

    @classmethod
    def prove_wc_activate_and_top_up_validators(cls, from_address: str, witnesses: list, amounts: list) -> dict:
        return ContractService.build_contract_tx(cls.pdg_abi_path, from_address, PDG_CONTRACT_ADDRESS, "proveWCActivateAndTopUpValidators", [witnesses, amounts])

    @classmethod
    def withdraw_node_operator_balance(cls, from_address: str, node_operator: str, amount_wei: int, recipient: str) -> dict:
        node_operator = Web3Tool.check_address(node_operator)
        recipient = Web3Tool.check_address(recipient)
        return ContractService.build_contract_tx(
            cls.pdg_abi_path,
            from_address,
            PDG_CONTRACT_ADDRESS,
            "withdrawNodeOperatorBalance",
            [node_operator, amount_wei, recipient],
        )

    @classmethod
    def top_up_existing_validators(cls, from_address: str, top_ups: list) -> dict:
        """
        top_ups: list of [pubkey_bytes, amount_int]
        """
        return ContractService.build_contract_tx(
            cls.pdg_abi_path,
            from_address,
            PDG_CONTRACT_ADDRESS,
            "topUpExistingValidators",
            [top_ups],
        )

    @classmethod
    def prove_unknown_validator(cls, from_address: str, witness: tuple, staking_vault: str) -> dict:
        """
        witness: [proof (bytes32[]), pubkey (bytes), validatorIndex (uint256), childBlockTimestamp (uint64), slot (uint64), proposerIndex (uint64)]
        staking_vault: address
        """
        staking_vault = Web3Tool.check_address(staking_vault)
        return ContractService.build_contract_tx(
            cls.pdg_abi_path,
            from_address,
            PDG_CONTRACT_ADDRESS,
            "proveUnknownValidator",
            [witness, staking_vault],
        )