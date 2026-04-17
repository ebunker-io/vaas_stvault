from validators.contract.contract_service import ContractService
import os
from validators.contract.stvault import config
from typing import Optional
from typing import Dict, Any, List
from validators.tool.web3 import Web3Tool


LAZY_ORACLE_CONTRACT_ADDRESS = config.LAZY_ORACLE_CONTRACT_ADDRESS


class LazyOracleContractService:
    lazy_oracle_abi_path = os.path.join(os.path.dirname(__file__), '..', 'abi', 'lazyoracle.json')

    @classmethod
    def get_latest_report_data(cls, vault: str) -> Optional[str]:
        result = ContractService.read_contract(LAZY_ORACLE_CONTRACT_ADDRESS, cls.lazy_oracle_abi_path, "latestReportData", [])
        return {
            'report_timestamp': result[0],
            'ref_slot': result[1],
            'tree_root': result[2],
            'report_cid': result[3],
        }

    @classmethod
    def updateVaultData(cls, from_address: str, args: List[Any]):
        from_address = Web3Tool.check_address(from_address)
        result = ContractService.build_contract_tx(cls.lazy_oracle_abi_path, from_address, LAZY_ORACLE_CONTRACT_ADDRESS, "updateVaultData", args)
        return result