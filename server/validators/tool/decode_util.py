from eth_abi import decode_abi
from hexbytes import HexBytes


class DecodeUtil(object):
    @classmethod
    def decode_deposit_data(cls, data_hex):
        # 转成 bytes
        data_bytes = HexBytes(data_hex)
        # DepositEvent ABI 类型
        types = ["bytes", "bytes", "bytes", "bytes", "bytes"]
        decoded = decode_abi(types, data_bytes)
        pubkey, withdrawal_credentials, amount_bytes, signature, index_bytes = decoded
        return {
            'pubkey': '0x' + pubkey.hex(),
            'withdrawal_credentials': '0x' + withdrawal_credentials.hex(),
            'amount_gwei': int.from_bytes(amount_bytes, byteorder="little"),
            'signature': '0x' + signature.hex(),
            'index': int.from_bytes(index_bytes, byteorder="little"),
        }

    @classmethod
    def decode_withdrawal_data(cls, data_hex):
        if data_hex.startswith("0x"):
            data_hex = data_hex[2:]

        # 地址：20字节 = 40 hex字符
        address_hex = data_hex[:40]
        address = "0x" + address_hex

        # pubkey：48字节 = 96 hex字符
        pubkey_hex = data_hex[40:136]
        pubkey = "0x" + pubkey_hex

        # amount：8字节 = 16 hex字符
        amount_hex = data_hex[136:]
        amount_bytes = bytes.fromhex(amount_hex)
        amount_gwei = int.from_bytes(amount_bytes, byteorder="big")

        return {
            "withdrawal_address": address.lower(),
            "pubkey": pubkey.lower(),
            "amount_gwei": amount_gwei
        }