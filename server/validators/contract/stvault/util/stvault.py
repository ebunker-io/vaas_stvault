from decimal import Decimal
from typing import Union
from validators.contract.stvault import config

BASIS_POINTS_DENOMINATOR: int = 10_000


class StvaultUtil:
    """
    stvault 相关通用工具。
    """

    @classmethod
    def format_bp(cls, bp: Union[int, float, Decimal]) -> str:
        """
        等价于前端的：
          formatBP = (bp) => `${((bp / BASIS_POINTS_DENOMINATOR) * 100).toFixed(2)}%`
        :param bp: basis points 数值（如 100 表示 1%）
        :return: 形如 '1.00%' 的百分比字符串
        """
        value = float(bp)
        percent = (value / BASIS_POINTS_DENOMINATOR) * 100.0
        return f"{percent:.2f}"

    @classmethod
    def format_to_eth(cls, wei: int, precision: int = 4) -> str:
        """
        将 wei 转换为 ether，并去除多余无效的0
        """
        value = Decimal(wei) / 10**18
        value_str = f"{value:.{precision}f}".rstrip('0').rstrip('.')
        return f"{value_str}"

    # ===== 计算健康因子 =====
    @classmethod
    def calculate_health(cls, total_value: int, liability_shares_in_steth_wei: int, forced_rebalance_threshold_bp: int) -> dict:
        """
        计算健康因子
        """
        # 将 JS/TS 的 calculateHealth 逻辑用 Python 实现

        # 转换为 Decimal，保证高精度
        total_value = Decimal(total_value)
        liability_shares_in_steth_wei = Decimal(liability_shares_in_steth_wei)
        forced_rebalance_threshold_bp = Decimal(forced_rebalance_threshold_bp)

        BASIS_POINTS_DENOMINATOR = Decimal(10_000)
        PRECISION = Decimal('1e18')

        threshold_multiplier = ((BASIS_POINTS_DENOMINATOR - forced_rebalance_threshold_bp) * PRECISION) / BASIS_POINTS_DENOMINATOR
        adjusted_valuation = (total_value * threshold_multiplier) / PRECISION

        if liability_shares_in_steth_wei > 0:
            health_ratio18 = (adjusted_valuation * PRECISION * Decimal(100)) / liability_shares_in_steth_wei
            health_ratio = float(health_ratio18 / PRECISION)
        else:
            health_ratio = "Infinity"

        is_healthy = health_ratio == "Infinity" or health_ratio >= 100

        return {
            "health_ratio": str(health_ratio),
            "is_healthy": is_healthy,
        }