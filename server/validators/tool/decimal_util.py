from decimal import Decimal, ROUND_FLOOR


class DecimalUtil(object):

    @classmethod
    def safe_decimal(cls, num):
        if num is None:
            return Decimal(0)
        return Decimal(num)

    @classmethod
    def quantize(cls, num, digital=8):
        num = cls.safe_decimal(num)
        if num == Decimal(0):
            return Decimal(0)
        exp = '0.' + '0' * digital
        return num.quantize(Decimal(exp), ROUND_FLOOR)
