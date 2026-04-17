from django.conf import settings
from validators.models.config import Config
import datetime


class AppConfig(object):
    REWARD_ADDRESS = 'reward_address'
    FEE_COMMISSION = 'fee_commission'
    MEV_COMMISSION = 'mev_commission'
    POOL_FEE_COMMISSION = 'pool_fee_commission'
    POOL_MEV_COMMISSION = 'pool_mev_commission'
    PRODUCE_BLOCK_REWARD_SYNC_BLOCK = 'produce_block_reward_sync_block'
    TRANSFER_REWARD_SYNC_BLOCK = 'transfer_reward_sync_block'
    INTERNAL_REWARD_SYNC_BLOCK = 'internal_reward_sync_block'
    ETH_EPOCH_GENESIS_TIME = 'eth_epoch_genesis_time'
    ETH_EPOCH_DURATION_SECONDS = 'eth_epoch_duration_seconds'
    ETH_SLOT_DURATION_SECONDS = 'eth_slot_duration_seconds'
    STATISTICS_CONSENSUS_SYNC_TIMESTAMP = 'statistics_consensus_sync_timestamp'
    STATISTICS_BLOCK_SYNC_TIMESTAMP = 'statistics_block_sync_timestamp'
    STATISTICS_SYNC_DURATION = 'statistics_sync_duration'
    VALIDATOR_SYNC_EPOCH = 'validator_sync_epoch'
    STAKE_EVENT_LAST_BLOCK = 'stake_event_last_block'
    CUSTOMER_CLAIM_MIN_REWARD = 'customer_claim_min_reward'
    CUSTOMER_CLAIM_NETWORK_FEE = 'customer_claim_network_fee'
    CUSTOMER_CLAIM_REWARD_MAX_TIMES_PER_DAY = 'customer_claim_reward_max_times_per_day'
    DING_ENABLE = 'ding_enable'
    EXECUTION_APR_ADJUST = 'execution_apr_adjust'
    INVITE_REBATE_RATIO = 'invite_rebate_ratio'
    WITHDRAWAL_SYNC_BLOCK = 'withdrawal_sync_block'
    BEACON_QUEUE = 'beacon_queue'
    SSV_WHITELIST = 'ssv_whitelist'
    EIGENLAYER_POD_OWNER_ADDRESS = 'eigenlayer_pod_owner_address'

    EIGENLAYER_CURVE_ADJUST_RATIO = 'eigenlayer_curve_adjust_ratio'

    @classmethod
    def config(cls):
        config_ret = Config.objects.all()
        return config_ret

    @classmethod
    def value_for_key(cls, key):
        config = cls.config().filter(key=key).first()
        if config:
            return config.value
        return None

    @classmethod
    def save(cls, key, value, value_type, force=False):
        config_old = Config.objects.filter(key=key)
        if len(config_old):
            if force:
                config = Config(id=config_old[0].id, key=key, value=value, value_type=value_type,
                                created_time=config_old[0].created_time)
                config.save(force_update=force)
        else:
            config = Config(key=key, value=value, value_type=value_type)
            config.save()
