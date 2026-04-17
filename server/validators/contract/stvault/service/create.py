import logging
import os
from validators.tool.web3 import Web3Tool
from validators.contract.contract_service import ContractService
from validators.contract.stvault import config



logger = logging.getLogger(__name__)
CREATE_CONTRACT_ADDRESS = config.CREATE_CONTRACT_ADDRESS

class CreateVaultService:
    # 这里获取根目录再拼接上路径
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    create_abi_path = os.path.join(BASE_DIR, 'contract', 'stvault', 'abi', 'create.json')

    @classmethod
    def get_create_abi(cls):
        return ContractService.get_abi(cls.create_abi_path)

    """
    调用 createVaultWithDashboard
    """
    @classmethod
    def create_vault_with_dashboard(
        cls,
        from_address: str,
        default_admin: str
    ) -> dict:
        args = [
            default_admin,
            config.get_operator_address(),
            config.get_operator_manager_address(),
            config.get_fee_bps(),
            config.get_confirm_expiry(),
            [],
        ]
        value_wei = Web3Tool.to_wei(config.get_create_default_value(), "ether")
        return ContractService.build_contract_tx(cls.create_abi_path, from_address, CREATE_CONTRACT_ADDRESS, "createVaultWithDashboard", args, value_wei)

    """
    调用 createVaultWithDashboardWithoutConnectingToVaultHub
    """
    @classmethod
    def create_vault_with_dashboard_without_connecting_to_vault_hub(cls, from_address: str, default_admin: str) -> dict:
        args = [
            default_admin,
            config.get_operator_address(),
            config.get_operator_manager_address(),
            config.get_fee_bps(),
            config.get_confirm_expiry(),
            [],
        ]
        value_wei = Web3Tool.to_wei(1, "ether")
        return ContractService.build_contract_tx(cls.create_abi_path, from_address, CREATE_CONTRACT_ADDRESS, "createVaultWithDashboardWithoutConnectingToVaultHub", args, value_wei)
