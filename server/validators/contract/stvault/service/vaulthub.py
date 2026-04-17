import logging
import os
from validators.contract.contract_service import ContractService
from typing import Optional
from validators.contract.stvault import config
from validators.tool.web3 import Web3Tool
from typing import Optional, Dict, Any



logger = logging.getLogger(__name__)
VAULT_HUB_CONTRACT_ADDRESS = config.VAULT_HUB_CONTRACT_ADDRESS


class VaultHubContractService:
    """
    VaultHub 合约相关调用封装。
    """
    vault_hub_abi_path = os.path.join(os.path.dirname(__file__), '..', 'abi', 'vaulthub.json')

    @classmethod
    def get_obligations(cls, vault: str) -> Optional[str]:
        result = ContractService.read_contract(VAULT_HUB_CONTRACT_ADDRESS, cls.vault_hub_abi_path, "obligations", [vault])
        return {
            'shares_to_burn': result[0],
            'fees_to_settle': result[1],
        }

    @classmethod
    def get_dashboard(cls, vault: str) -> Optional[Dict[str, Any]]:
        vault = Web3Tool.check_address(vault)
        result = ContractService.read_contract(VAULT_HUB_CONTRACT_ADDRESS, cls.vault_hub_abi_path, "vaultConnection", [vault])
        return result[0] if result else None


    @classmethod
    def is_report_fresh(cls, vault: str) -> Optional[bool]:
        result = ContractService.read_contract(VAULT_HUB_CONTRACT_ADDRESS, cls.vault_hub_abi_path, "isReportFresh", [vault])
        return result