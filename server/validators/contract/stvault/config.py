from django.conf import settings
from validators.models.stvault_config import StVaultConfig


# 根据环境变量 BACKEND_SSV_NETWORK 设置 stv 和 pdg 合约地址
NETWORK = settings.BACKEND.get("network").lower()


def _get_config_value(key: str, default_value):
    """
    从数据库获取配置值，如果不存在则返回默认值
    """
    try:
        value = StVaultConfig.get_value(key)
        if value is not None and value != '':
            return value
    except Exception:
        pass
    return default_value


def _get_config_int_value(key: str, default_value: int) -> int:
    """
    从数据库获取整数配置值，如果不存在则返回默认值
    """
    try:
        return StVaultConfig.get_int_value(key, default_value)
    except Exception:
        pass
    return default_value


# 合约地址等固定配置（不需要从数据库读取）
if NETWORK == "hoodi":
    CREATE_CONTRACT_ADDRESS = "0x7Ba269a03eeD86f2f54CB04CA3b4b7626636Df4E"
    PDG_CONTRACT_ADDRESS = "0xa5F55f3402beA2B14AE15Dae1b6811457D43581d"
    STETH_CONTRACT_ADDRESS = "0x3508A952176b3c15387C97BE809eaffB1982176a"
    VAULT_HUB_CONTRACT_ADDRESS = "0x4C9fFC325392090F789255b9948Ab1659b797964"
    OPERATOR_GRID_CONTRACT_ADDRESS = "0x501e678182bB5dF3f733281521D3f3D1aDe69917"
    LAZY_ORACLE_CONTRACT_ADDRESS = "0xf41491C79C30e8f4862d3F4A5b790171adB8e04A"
    NODE_OPERATOR_SET_TOPIC = "0x57d209fa057c282ad4b54dc6ad1a002b01d20bf16299f62ff8040943a692b8d3"

else:
    # 默认为 mainnet
    CREATE_CONTRACT_ADDRESS = "0x02Ca7772FF14a9F6c1a08aF385aA96bb1b34175A"
    PDG_CONTRACT_ADDRESS = "0xF4bF42c6D6A0E38825785048124DBAD6c9eaaac3"
    STETH_CONTRACT_ADDRESS = "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"
    VAULT_HUB_CONTRACT_ADDRESS = "0x1d201BE093d847f6446530Efb0E8Fb426d176709"
    OPERATOR_GRID_CONTRACT_ADDRESS = "0xC69685E89Cefc327b43B7234AC646451B27c544d"
    LAZY_ORACLE_CONTRACT_ADDRESS = "0x5DB427080200c235F2Ae8Cd17A7be87921f7AD6c"
    NODE_OPERATOR_SET_TOPIC = "0x57d209fa057c282ad4b54dc6ad1a002b01d20bf16299f62ff8040943a692b8d3"



# 动态获取配置的函数（每次调用时从数据库读取，保证实时性）
def get_confirm_expiry() -> int:
    """获取确认过期时间"""
    if NETWORK == "mainnet":
        return _get_config_int_value('CONFIRM_EXPIRY', 129600)
    else:
        return _get_config_int_value('CONFIRM_EXPIRY', 129600)


def get_fee_bps() -> int:
    """获取费用基点"""
    if NETWORK == "mainnet":
        return _get_config_int_value('FEE_BPS', 350)
    else:
        return _get_config_int_value('FEE_BPS', 350)


def get_create_default_value() -> int:
    """获取创建默认值"""
    return _get_config_int_value('CREATE_DEFAULT_VALUE', 1)


def get_operator_address() -> str:
    """获取节点运营商地址"""
    if NETWORK == "mainnet":
        return _get_config_value('OPERATOR_ADDRESS', '')
    else:
        return _get_config_value('OPERATOR_ADDRESS', '')


def get_operator_manager_address() -> str:
    """获取节点运营商管理员地址"""
    if NETWORK == "mainnet":
        return _get_config_value('OPERATOR_MANAGER_ADDRESS', '')
    else:
        return _get_config_value('OPERATOR_MANAGER_ADDRESS', '')


def get_is_paused() -> bool:
    """获取是否暂停创建vault"""
    is_paused = _get_config_int_value('IS_PAUSED', 1)
    return is_paused != 0
