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
    HEALTH_RATIO_CAP = Decimal('9999.99')  # 超过此值业务上等同 ∞，统一返回 'Infinity'

    @classmethod
    def calculate_health(cls, total_value: int, liability_shares_in_steth_wei: int, forced_rebalance_threshold_bp: int) -> dict:
        """
        计算健康因子（百分比形式）。
        - 无 debt（liability <= 0）→ 'Infinity'
        - liability 极小导致 ratio 超出上限 → 同样返回 'Infinity'
        - 正常区间 → 形如 '152.34' 的字符串，2 位小数
        Decimal 全流程，不走 float，避免大数被序列化成科学计数法。
        """
        total_value = Decimal(total_value)
        liability = Decimal(liability_shares_in_steth_wei)
        bp = Decimal(forced_rebalance_threshold_bp)

        BASIS_POINTS_DENOMINATOR = Decimal(10_000)
        adjusted_valuation = total_value * (BASIS_POINTS_DENOMINATOR - bp) / BASIS_POINTS_DENOMINATOR

        if liability <= 0:
            return {"health_ratio": "Infinity", "is_healthy": True}

        ratio = adjusted_valuation * Decimal(100) / liability
        if ratio > cls.HEALTH_RATIO_CAP:
            return {"health_ratio": "Infinity", "is_healthy": True}

        ratio = ratio.quantize(Decimal('0.01'))
        return {
            "health_ratio": str(ratio),
            "is_healthy": ratio >= Decimal(100),
        }