from mysite.appconfig import AppConfig


class SlotUtil(object):
    """
    timestamp's epoch
    """

    @classmethod
    def slot_of_timestamp(cls, timestamp):
        genesis_time = AppConfig.value_for_key(AppConfig.ETH_EPOCH_GENESIS_TIME)
        slot_duration = AppConfig.value_for_key(AppConfig.ETH_SLOT_DURATION_SECONDS)

        return int((int(timestamp) - int(genesis_time)) / int(slot_duration))

    @classmethod
    def timestamp_of_slot(cls, slot):
        genesis_time = int(AppConfig.value_for_key(AppConfig.ETH_EPOCH_GENESIS_TIME))
        slot_duration = int(AppConfig.value_for_key(AppConfig.ETH_SLOT_DURATION_SECONDS))
        return genesis_time + slot_duration * slot

    @classmethod
    def epoch_of_slot(cls, slot):
        epoch_duration = int(AppConfig.value_for_key(AppConfig.ETH_EPOCH_DURATION_SECONDS))
        slot_duration = int(AppConfig.value_for_key(AppConfig.ETH_SLOT_DURATION_SECONDS))
        return int(slot / (epoch_duration / slot_duration))
