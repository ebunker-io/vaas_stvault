import logging
import os
from validators.tool.web3 import Web3Tool
from validators.contract.contract_service import ContractService
from validators.contract.stvault import config



logger = logging.getLogger(__name__)


class VaultContractService:
    vault_abi_path = os.path.join(os.path.dirname(__file__), '..', 'abi', 'vault.json')


    @classmethod
    def withdrawal_credentials(cls, vault: str) -> str:
        vault = Web3Tool.check_address(vault)
        result = ContractService.read_contract(vault, cls.vault_abi_path, "withdrawalCredentials", [])
        result = Web3Tool.to_hex(result)
        return result