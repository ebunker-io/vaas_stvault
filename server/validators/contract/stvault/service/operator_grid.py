
import logging
import os
from validators.contract.contract_service import ContractService
from typing import Optional
from validators.contract.stvault import config



logger = logging.getLogger(__name__)
OPERATOR_GRID_CONTRACT_ADDRESS = config.OPERATOR_GRID_CONTRACT_ADDRESS


class OperatorGridContractService:
    """
    VaultHub 合约相关调用封装。
    """
    operator_grid_abi_path = os.path.join(os.path.dirname(__file__), '..', 'abi', 'operator_grid.json')

    @classmethod
    def get_vault_tier_info(cls, vault: str) -> Optional[str]:
        result = ContractService.read_contract(OPERATOR_GRID_CONTRACT_ADDRESS, cls.operator_grid_abi_path, "vaultTierInfo", [vault])
        return {
            'node_perator ': result[0],
            'tier_id': result[1],
            'share_limit': result[2],
            'reserve_ratio_bp': result[3],
            'forced_rebalance_threshold_bp': result[4],
            'infra_fee_bp': result[5],
            'liquidity_fee_bp': result[6],
            'reservation_fee_bp': result[7],
        }

    @classmethod
    def change_tier(cls, vault: str, tier_id: int, share_limit: int) -> Optional[str]:
        return ContractService.build_contract_tx(OPERATOR_GRID_CONTRACT_ADDRESS, cls.operator_grid_abi_path, "changeTier", [vault, tier_id, share_limit])