from eth_account import Account
from eth_utils import to_checksum_address

class AddressUtil(object):

    @classmethod
    def address_add_0x_and_lower(cls, address):
        if len(address) == 0:
            return address
        if address.startswith('0x'):
            return address.lower()
        return '0x' + address.lower()

    @classmethod
    def add_mark(cls, address):
        if len(address) < 10:
            return address
        return address[:6] + '...' + address[-4:]

    # 将withdrawal_credentials转为标准的地址
    @classmethod
    def withdrawal_credentials_to_address(cls, withdrawal_credentials):
        if not withdrawal_credentials or len(withdrawal_credentials) < 40:
            return withdrawal_credentials
        # 取后40位作为地址主体
        tail40 = withdrawal_credentials[-40:]
        hex_addr = '0x' + tail40.lower()
        # 返回EIP-55校验和地址
        try:
            return to_checksum_address(hex_addr)
        except Exception:
            return None
