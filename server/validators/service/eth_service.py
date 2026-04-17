import logging
from validators.tool.web3 import get_web3

logger = logging.getLogger(__name__)


class ETHService:
    @classmethod
    def get_latest_block(cls) -> int:
        return get_web3().eth.block_number
