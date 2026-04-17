import logging
from packaging import version
from eth_typing import (
    BLSPubkey,
    BLSSignature,
)

from py_ecc.bls import G2ProofOfPossession as bls
from .ssz import (
    compute_deposit_domain,
    compute_signing_root,
    DepositData,
    DepositMessage,
)
from .constants import (
    MAX_DEPOSIT_AMOUNT,
    MIN_DEPOSIT_AMOUNT,
    MAX_DEPOSIT_AMOUNT_02,
    BLS_WITHDRAWAL_PREFIX,
    ETH1_ADDRESS_WITHDRAWAL_PREFIX,
    ETH1_ADDRESS_WITHDRAWAL_PREFIX_02
)
from django.conf import settings

logger = logging.getLogger(__name__)

class ValidateDepositKey:

    ETHER_TO_GWEI = 1e9
    MIN_DEPOSIT_AMOUNT = 1 * ETHER_TO_GWEI
    MIN_DEPOSIT_CLI_VERSION = '1.0.0'
    MAINNET_FORK_VERSION = '00000000'
    GOERLI_FORK_VERSION = '00001020'
    HOODI_FORK_VERSION = '10000910'

    @classmethod
    def validator_deposit_key(cls, deposit_datas, reward_address, skip_check_reward_address):
        if not isinstance(deposit_datas, list):
            logger.warning('validator_deposit_key fail, not list')
            return False
        if len(deposit_datas) <= 0:
            logger.warning('validator_deposit_key fail, len <=0')
            return False
        for deposit_data_dict in deposit_datas:
            if not cls.validate_field_formatting(deposit_data_dict):
                logger.warning('validator_deposit_key fail, validate_field_formatting')
                return False

            pubkey = BLSPubkey(bytes.fromhex(deposit_data_dict['pubkey']))
            withdrawal_credentials = bytes.fromhex(deposit_data_dict['withdrawal_credentials'])
            amount = deposit_data_dict['amount']
            signature = BLSSignature(bytes.fromhex(deposit_data_dict['signature']))
            deposit_message_root = bytes.fromhex(deposit_data_dict['deposit_data_root'])
            fork_version = bytes.fromhex(deposit_data_dict['fork_version'])

            # Verify pubkey
            if len(pubkey) != 48:
                logger.warning('validator_deposit_key fail, len(pubkey) != 48')
                return False
            if deposit_data_dict['network_name'] != settings.ETH['network']:
                logger.warning('validator_deposit_key fail, error network_name, %s', deposit_data_dict['network_name'])
                return False
            if deposit_data_dict['network_name'] == 'mainnet':
                if deposit_data_dict['fork_version'] != cls.MAINNET_FORK_VERSION:
                    logger.warning('validator_deposit_key fail, unmatch fork_version for mainnet, %s', deposit_data_dict['fork_version'])
                    return False
            elif deposit_data_dict['network_name'] == 'goerli':
                if deposit_data_dict['fork_version'] != cls.GOERLI_FORK_VERSION:
                    logger.warning('validator_deposit_key fail, unmatch fork_version for goerli, %s', deposit_data_dict['fork_version'])
                    return False
            elif deposit_data_dict['network_name'] == 'hoodi':
                if deposit_data_dict['fork_version'] != cls.HOODI_FORK_VERSION:
                    logger.warning('validator_deposit_key fail, unmatch fork_version for hoodi, %s', deposit_data_dict['fork_version'])
                    return False
            else:
                logger.warning('validator_deposit_key fail, error network_name, %s', deposit_data_dict['network_name'])
                return False
            # Verify withdrawal credential
            if withdrawal_credentials[:1] == BLS_WITHDRAWAL_PREFIX:
                # 不允许不指定收益地址
                logger.warning('validator_deposit_key fail, BLS_WITHDRAWAL_PREFIX')
                return False
            elif withdrawal_credentials[:1] == ETH1_ADDRESS_WITHDRAWAL_PREFIX or withdrawal_credentials[:1] == ETH1_ADDRESS_WITHDRAWAL_PREFIX_02:
                if withdrawal_credentials[1:12] != b'\x00' * 11:
                    logger.warning('validator_deposit_key fail, withdrawal_credentials[1:12] != b0')
                    return False
                if not reward_address:
                    logger.warning('validator_deposit_key fail, no reward_address')
                    return False
                if deposit_data_dict['withdrawal_credentials'][24:].lower() != reward_address[2:] and not skip_check_reward_address:
                    logger.warning('validator_deposit_key fail, unmatch reward_address')
                    return False
            else:
                logger.warning('validator_deposit_key fail, withdrawal_credentials[:1] unformated')
                return False
            # Verify deposit amount
            if withdrawal_credentials[:1] == ETH1_ADDRESS_WITHDRAWAL_PREFIX:
                if not MIN_DEPOSIT_AMOUNT < amount <= MAX_DEPOSIT_AMOUNT:
                    logger.warning('validator_deposit_key fail, amount out range')
                    return False
            elif withdrawal_credentials[:1] == ETH1_ADDRESS_WITHDRAWAL_PREFIX_02:
                if not MIN_DEPOSIT_AMOUNT < amount <= MAX_DEPOSIT_AMOUNT_02:
                    logger.warning('validator_deposit_key fail, amount out range')
                    return False
            else:
                return False

            # Verify deposit signature && pubkey
            deposit_message = DepositMessage(pubkey=pubkey, withdrawal_credentials=withdrawal_credentials, amount=amount)
            domain = compute_deposit_domain(fork_version)
            signing_root = compute_signing_root(deposit_message, domain)
            if not bls.Verify(pubkey, signing_root, signature):
                logger.warning('validator_deposit_key fail, Verify deposit signature && pubkey')
                return False
            # Verify Deposit Root
            signed_deposit = DepositData(
                pubkey=pubkey,
                withdrawal_credentials=withdrawal_credentials,
                amount=amount,
                signature=signature,
            )
            if not signed_deposit.hash_tree_root == deposit_message_root:
                logger.warning('validator_deposit_key fail, Verify Deposit Root')
                return False
        return True

    @classmethod
    def verify_topup_deposit(cls, deposit_datas):
        if not isinstance(deposit_datas, list):
            logger.warning('validator_deposit_key fail, not list')
            return False
        if len(deposit_datas) <= 0:
            logger.warning('validator_deposit_key fail, len <=0')
            return False
        for deposit_data_dict in deposit_datas:
            if not cls.validate_field_formatting(deposit_data_dict):
                logger.warning('validator_deposit_key fail, validate_field_formatting')
                return False

            pubkey = BLSPubkey(bytes.fromhex(deposit_data_dict['pubkey']))
            withdrawal_credentials = bytes.fromhex(deposit_data_dict['withdrawal_credentials'])
            amount = deposit_data_dict['amount']
            signature = BLSSignature(bytes.fromhex(deposit_data_dict['signature']))
            deposit_message_root = bytes.fromhex(deposit_data_dict['deposit_data_root'])
            fork_version = bytes.fromhex(deposit_data_dict['fork_version'])

            # Verify pubkey
            if len(pubkey) != 48:
                logger.warning('validator_deposit_key fail, len(pubkey) != 48')
                return False
            if deposit_data_dict['network_name'] != settings.ETH['network']:
                logger.warning('validator_deposit_key fail, error network_name, %s', deposit_data_dict['network_name'])
                return False
            if deposit_data_dict['network_name'] == 'mainnet':
                if deposit_data_dict['fork_version'] != cls.MAINNET_FORK_VERSION:
                    logger.warning('validator_deposit_key fail, unmatch fork_version for mainnet, %s', deposit_data_dict['fork_version'])
                    return False
            elif deposit_data_dict['network_name'] == 'goerli':
                if deposit_data_dict['fork_version'] != cls.GOERLI_FORK_VERSION:
                    logger.warning('validator_deposit_key fail, unmatch fork_version for goerli, %s', deposit_data_dict['fork_version'])
                    return False
            elif deposit_data_dict['network_name'] == 'hoodi':
                if deposit_data_dict['fork_version'] != cls.HOODI_FORK_VERSION:
                    logger.warning('validator_deposit_key fail, unmatch fork_version for hoodi, %s', deposit_data_dict['fork_version'])
                    return False
            else:
                logger.warning('validator_deposit_key fail, error network_name, %s', deposit_data_dict['network_name'])
                return False
            # Verify withdrawal credential
            if withdrawal_credentials[1:12] != b'\x00' * 11:
                    logger.warning('validator_deposit_key fail, withdrawal_credentials[1:12] != b0')
                    return False

            # Verify deposit amount
            if not MIN_DEPOSIT_AMOUNT <= amount <= MAX_DEPOSIT_AMOUNT_02:
                    logger.warning('validator_deposit_key fail, amount out range')
                    return False

            # Verify deposit signature && pubkey
            deposit_message = DepositMessage(pubkey=pubkey, withdrawal_credentials=withdrawal_credentials, amount=amount)
            domain = compute_deposit_domain(fork_version)
            signing_root = compute_signing_root(deposit_message, domain)
            # hex_signing_root = signing_root.hex()
            # hex_signature = signature.hex()
            # hex_pubkey = pubkey.hex()
            # print(hex_signing_root)
            # print(hex_signature)
            # print(hex_pubkey)
            # if not bls.Verify(pubkey, signing_root, signature):
            #     logger.warning('validator_deposit_key fail, Verify deposit signature && pubkey')
            #     return False
            # Verify Deposit Root
            signed_deposit = DepositData(
                pubkey=pubkey,
                withdrawal_credentials=withdrawal_credentials,
                amount=amount,
                signature=signature,
            )
            if not signed_deposit.hash_tree_root == deposit_message_root:
                logger.warning('validator_deposit_key fail, Verify Deposit Root')
                return False
        return True

    @classmethod
    def validate_field_formatting(cls, deposit):
        # check existence of required keys
        if any([not deposit.get(name) for name in ['pubkey', 'withdrawal_credentials', 'amount', 'signature', 'deposit_message_root', 'deposit_data_root', 'fork_version', 'deposit_cli_version']]):
            return False
        # check type of values
        if not isinstance(deposit['amount'], int) or any([not isinstance(deposit[name], str) for name in ['pubkey', 'withdrawal_credentials', 'signature', 'deposit_message_root', 'deposit_data_root', 'fork_version', 'deposit_cli_version']]):
            return False
        # check length of strings
        if len(deposit['pubkey']) != 96 or len(deposit['withdrawal_credentials']) != 64 or len(deposit['signature']) != 192 or len(deposit['deposit_message_root']) != 64 or len(deposit['deposit_data_root']) != 64 or len(deposit['fork_version']) != 8:
            return False
        # check the deposit amount
        withdrawal_credentials = bytes.fromhex(deposit['withdrawal_credentials'])
        if withdrawal_credentials[:1] == ETH1_ADDRESS_WITHDRAWAL_PREFIX:
            if deposit['amount'] < cls.MIN_DEPOSIT_AMOUNT or deposit['amount'] > 32 * cls.ETHER_TO_GWEI:
                return False
        elif withdrawal_credentials[:1] == ETH1_ADDRESS_WITHDRAWAL_PREFIX_02:
            if deposit['amount'] < cls.MIN_DEPOSIT_AMOUNT or deposit['amount'] > MAX_DEPOSIT_AMOUNT_02:
                return False
        elif deposit['withdrawal_credentials'] == '0000000000000000000000000000000000000000000000000000000000000000':
            return True
        else:
            return False
        if version.parse(deposit['deposit_cli_version']) < version.parse(cls.MIN_DEPOSIT_CLI_VERSION):
            return False
        return True
