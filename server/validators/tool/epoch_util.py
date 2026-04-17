from mysite.appconfig import AppConfig


class EpochUtil(object):
    """
    timestamp's epoch
    """

    @classmethod
    def epochs(cls, timestamp):
        genesis_time = AppConfig.value_for_key(AppConfig.ETH_EPOCH_GENESIS_TIME)
        epoch_duration = AppConfig.value_for_key(AppConfig.ETH_EPOCH_DURATION_SECONDS)
        return int((int(timestamp) - int(genesis_time)) / int(epoch_duration))

    @classmethod
    def timestamp_of_epoch(cls, epoch):
        genesis_time = int(AppConfig.value_for_key(AppConfig.ETH_EPOCH_GENESIS_TIME))
        epoch_duration = int(AppConfig.value_for_key(AppConfig.ETH_EPOCH_DURATION_SECONDS))
        return genesis_time + epoch_duration * epoch

    @classmethod
    def first_slot_of_epoch(cls, epoch):
        epoch_duration = int(AppConfig.value_for_key(AppConfig.ETH_EPOCH_DURATION_SECONDS))
        slot_duration = int(AppConfig.value_for_key(AppConfig.ETH_SLOT_DURATION_SECONDS))
        return int(epoch * (epoch_duration / slot_duration))
