from enum import Enum
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from validators.tool.web3 import Web3Tool
from validators.contract.contract_service import ContractService
from decimal import Decimal
from typing import Union, Optional, Any, List, Dict
from validators.contract.stvault.service.steth import STETHContractService
from validators.contract.stvault.util.stvault import StvaultUtil
from validators.models import StVault



logger = logging.getLogger(__name__)


class VaultOperationType(Enum):
    MINT = 'mint'
    BURN = 'burn'


class DashboardContractService:
    """
    Dashboard 合约相关调用封装。
    """
    dashboard_abi_path = os.path.join(os.path.dirname(__file__), '..', 'abi', 'dasboard.json')


    """
    Dashboard 合约只读函数
    """
    @classmethod
    def get_operator_manager(cls, dashboard: str) -> Optional[str]:
        manager_role = ContractService.read_contract(dashboard, cls.dashboard_abi_path, "NODE_OPERATOR_MANAGER_ROLE", [])
        operator_manager = ContractService.read_contract(dashboard, cls.dashboard_abi_path, "getRoleMembers", [manager_role])
        return operator_manager

    @classmethod
    def get_staking_vault_address(cls, dashboard: str) -> Optional[str]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "stakingVault", [])

    @classmethod
    def get_steth_token_address(cls, dashboard: str) -> Optional[str]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "STETH", [])

    @classmethod
    def get_wsteth_token_address(cls, dashboard: str) -> Optional[str]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "WSTETH", [])

    @classmethod
    def get_lido_locator_address(cls, dashboard: str) -> Optional[str]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "LIDO_LOCATOR", [])

    @classmethod
    def get_vault_hub_address(cls, dashboard: str) -> Optional[str]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "VAULT_HUB", [])

    @classmethod
    def get_vault_connection(cls, dashboard: str) -> Optional[Dict[str, Any]]:
        result = ContractService.read_contract(dashboard, cls.dashboard_abi_path, "vaultConnection", [])
        return {
            "owner": result[0],
            "share_limit": result[1],
            "vault_index": result[2],
            "disconnect_initiated_ts": result[3],
            "reserve_ratio_bp": result[4],
            "forced_rebalance_threshold_bp": result[5],
            "infra_fee_bp": result[6],
            "liquidity_fee_bp": result[7],
            "reservation_fee_bp": result[8],
            "beacon_chain_deposits_pause_intent": result[9],
        }


    @classmethod
    def get_liability_shares(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "liabilityShares", [])

    @classmethod
    def get_obligations(cls, dashboard: str) -> Optional[int]:
        result = ContractService.read_contract(dashboard, cls.dashboard_abi_path, "obligations", [])
        return {
            "shares_to_burn": result[0],
            "fees_to_settle": result[1],
        }

    @classmethod
    def get_total_minting_capacity_shares(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "totalMintingCapacityShares", [])

    @classmethod
    def get_remaining_minting_capacity_shares(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "remainingMintingCapacityShares", [0])

    @classmethod
    def get_withdrawable_value(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "withdrawableValue", [])

    @classmethod
    def get_settled_growth(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "settledGrowth", [])

    @classmethod
    def get_fee_recipient(cls, dashboard: str) -> Optional[str]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "feeRecipient", [])

    @classmethod
    def get_accrued_fee(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "accruedFee", [])

    @classmethod
    def get_fee_rate(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "feeRate", [])

    @classmethod
    def get_confirm_expiry(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "getConfirmExpiry", [])

    @classmethod
    def get_max_confirm_expiry(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "MAX_CONFIRM_EXPIRY", [])

    @classmethod
    def get_min_confirm_expiry(cls, dashboard: str) -> Optional[int]:
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "MIN_CONFIRM_EXPIRY", [])

    @classmethod
    def get_total_value(cls, dashboard: str) -> Optional[int]:
        """获取总价值"""
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "totalValue", [])

    @classmethod
    def get_locked(cls, dashboard: str) -> Optional[int]:
        """获取锁定值"""
        return ContractService.read_contract(dashboard, cls.dashboard_abi_path, "locked", [])

    @classmethod
    def get_max_lockable_value(cls, dashboard: str) -> Optional[int]:
        """获取最大可锁定值"""
        return cls.max_lockable_value(dashboard)
















    @classmethod
    def latest_report(cls, contract_address: str) -> Optional[Dict[str, Any]]:
        result = ContractService.read_contract(contract_address, cls.dashboard_abi_path, "latestReport", [])
        return {
            "totalValue": result[0],
            "inOutDelta": result[1],
            "timestamp": result[2]
        }

    @classmethod
    def minimal_reserve(cls, contract_address: str) -> Optional[int]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "minimalReserve")

    @classmethod
    def max_lockable_value(cls, contract_address: str) -> Optional[int]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "maxLockableValue")




    @classmethod
    def burn_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "BURN_ROLE")

    @classmethod
    def collect_vault_erc20_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "COLLECT_VAULT_ERC20_ROLE")

    @classmethod
    def fund_on_receive_flag_slot(cls, contract_address: str) -> Optional[int]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "FUND_ON_RECEIVE_FLAG_SLOT")

    @classmethod
    def fund_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "FUND_ROLE")

    @classmethod
    def lido_locator(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "LIDO_LOCATOR")

    @classmethod
    def mint_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "MINT_ROLE")

    @classmethod
    def node_operator_fee_exempt_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "NODE_OPERATOR_FEE_EXEMPT_ROLE")

    @classmethod
    def node_operator_manager_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "NODE_OPERATOR_MANAGER_ROLE")

    @classmethod
    def node_operator_prove_unknown_validator_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "NODE_OPERATOR_PROVE_UNKNOWN_VALIDATOR_ROLE")

    @classmethod
    def node_operator_unguaranteed_deposit_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "NODE_OPERATOR_UNGUARANTEED_DEPOSIT_ROLE")

    @classmethod
    def pause_beacon_chain_deposits_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "PAUSE_BEACON_CHAIN_DEPOSITS_ROLE")

    @classmethod
    def request_validator_exit_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "REQUEST_VALIDATOR_EXIT_ROLE")

    @classmethod
    def resume_beacon_chain_deposits_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "RESUME_BEACON_CHAIN_DEPOSITS_ROLE")

    @classmethod
    def trigger_validator_withdrawal_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "TRIGGER_VALIDATOR_WITHDRAWAL_ROLE")

    @classmethod
    def vault_configuration_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "VAULT_CONFIGURATION_ROLE")

    @classmethod
    def vault_hub(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "VAULT_HUB")

    @classmethod
    def voluntary_disconnect_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "VOLUNTARY_DISCONNECT_ROLE")

    @classmethod
    def withdraw_role(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "WITHDRAW_ROLE")

    @classmethod
    def accrued_fee(cls, contract_address: str) -> Optional[int]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "accruedFee")



    @classmethod
    def fee_recipient(cls, contract_address: str) -> Optional[str]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "feeRecipient")

    @classmethod
    def locked(cls, contract_address: str) -> Optional[int]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "locked")

    @classmethod
    def total_value(cls, contract_address: str) -> Optional[int]:
        return ContractService.read_contract(contract_address, cls.dashboard_abi_path, "totalValue")








    """
    Dashboard 合约写合约函数
    """
    @classmethod
    def fund(cls, from_address: str, contract_address: str, value_wei: int = 0) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "fund", [], value_wei)

    @classmethod
    def mint_shares(cls, from_address: str, contract_address: str, recipient: str, amount_of_shares: int) -> dict:
        recipient = Web3Tool.check_address(recipient)
        value_wei = 0
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "mintShares", [recipient, amount_of_shares], value_wei)

    @classmethod
    def withdraw(cls, from_address: str, contract_address: str, recipient: str, value_wei: int = 0) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "withdraw", [recipient, value_wei])

    @classmethod
    def burn_shares(cls, from_address: str, contract_address: str, amount_of_shares: int) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "burnShares", [amount_of_shares])

    @classmethod
    def burn_steth(cls, from_address: str, contract_address: str, amount_of_steth: int) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "burnStETH", [amount_of_steth])

    @classmethod
    def burn_wsteth(cls, from_address: str, contract_address: str, amount_of_wsteth: int) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "burnWstETH", [amount_of_wsteth])

    @classmethod
    def change_tier(cls, from_address: str, contract_address: str, tier_id: int, requested_share_limit: int) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "changeTier", [tier_id, requested_share_limit])

    @classmethod
    def connect_and_accept_tier(cls, from_address: str, contract_address: str, tier_id: int, requested_share_limit: int, value_wei: int = 0) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "connectAndAcceptTier", [tier_id, requested_share_limit], value_wei)

    @classmethod
    def connect_to_vault_hub(cls, from_address: str, contract_address: str, value_wei: int = 0) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "connectToVaultHub", [], value_wei)

    @classmethod
    def grant_role(cls, from_address: str, contract_address: str, role: bytes, account: str) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "grantRole", [role, Web3Tool.check_address(account)])

    @classmethod
    def grant_roles(cls, from_address: str, contract_address: str, assignments: List[Dict[str, Any]]) -> dict:
        normalized = [{"account": Web3Tool.check_address(i["account"]), "role": i["role"]} for i in assignments]
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "grantRoles", [normalized])

    @classmethod
    def mint_steth(cls, from_address: str, contract_address: str, recipient: str, amount_of_steth: int, value_wei: int = 0) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "mintStETH", [Web3Tool.check_address(recipient), amount_of_steth], value_wei)

    @classmethod
    def mint_wsteth(cls, from_address: str, contract_address: str, recipient: str, amount_of_wsteth: int, value_wei: int = 0) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "mintWstETH", [Web3Tool.check_address(recipient), amount_of_wsteth], value_wei)

    @classmethod
    def prove_unknown_validators_to_pdg(cls, from_address: str, contract_address: str, witnesses: list) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "proveUnknownValidatorsToPDG", [witnesses])

    @classmethod
    def rebalance_vault_with_ether(cls, from_address: str, contract_address: str, amount_wei: int) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "rebalanceVaultWithEther", [amount_wei])

    @classmethod
    def rebalance_vault_with_shares(cls, from_address: str, contract_address: str, shares: int) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "rebalanceVaultWithShares", [shares])

    @classmethod
    def reconnect_to_vault_hub(cls, from_address: str, contract_address: str) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "reconnectToVaultHub", [])

    @classmethod
    def resume_beacon_chain_deposits(cls, from_address: str, contract_address: str) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "resumeBeaconChainDeposits", [])

    @classmethod
    def revoke_role(cls, from_address: str, contract_address: str, role: bytes, account: str) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "revokeRole", [role, Web3Tool.check_address(account)])

    @classmethod
    def revoke_roles(cls, from_address: str, contract_address: str, assignments: List[Dict[str, Any]]) -> dict:
        normalized = [{"account": Web3Tool.check_address(i["account"]), "role": i["role"]} for i in assignments]
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "revokeRoles", [normalized])

    @classmethod
    def set_fee_recipient(cls, from_address: str, contract_address: str, new_fee_recipient: str) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "setFeeRecipient", [Web3Tool.check_address(new_fee_recipient)])

    @classmethod
    def set_pdg_policy(cls, from_address: str, contract_address: str, pdg_policy: int) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "setPDGPolicy", [pdg_policy])

    @classmethod
    def trigger_validator_withdrawals(cls, from_address: str, contract_address: str, pubkeys: bytes, amounts_in_gwei: list, refund_recipient: str, value_wei: int = 0) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "triggerValidatorWithdrawals", [pubkeys, amounts_in_gwei, Web3Tool.check_address(refund_recipient)], value_wei)

    @classmethod
    def unguaranteed_deposit_to_beacon_chain(cls, from_address: str, contract_address: str, deposits: list) -> dict:
    #     for (const deposit of deposits) {
    #   const pubkey = web3.utils.hexToBytes("0x" + deposit.pubkey);
    #   const signature = web3.utils.hexToBytes("0x" + deposit.signature);
    #   const amount = deposit.amount * 10 ** 9;
    #   const depositDataRoot = web3.utils.hexToBytes("0x" + deposit.deposit_data_root);
    #   depositData.push([pubkey, signature, amount, depositDataRoot]);
    # }
    # const data = await contract.methods
    #   .unguaranteedDepositToBeaconChain(depositData)
    #   .encodeABI();
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "unguaranteedDepositToBeaconChain", [deposits])

    @classmethod
    def request_validator_exit(cls, from_address: str, contract_address: str, pubkey: str) -> dict:
        return ContractService.build_contract_tx(cls.dashboard_abi_path, from_address, contract_address, "requestValidatorExit", [pubkey])