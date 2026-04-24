import logging

logger = logging.getLogger(__name__)
class Result:
    code = 0
    msg = ""
    data = None
    success = True

    MESSAGE_DICT = {
        'en': {
            'success': 'Success',
            'system_error': 'Please try again later',
            'invalid_params': 'Parameter error, please check',
            'invalid_token': 'Your session has expired. Please connect your wallet again.',
            'invalid_captcha': 'Invalid verification code, please try again.',
            'invalid_email': 'Invalid email format',
            'invalid_reward_address': 'Invalid reward address',
            'send_email_fail': 'Message not delivered',
            'low_claimable_balance': 'Insufficient balance',
            'over_claim_times': "You've exceeded your withdrawal limit. Please try again in 24 hours.",
            'unstakable_order': 'Your validators have been deposited, can not get deposit_data',
            'mismatch_reward_address': 'Wrong address',
            'not_found': 'Error',
            'too_many_unfinishe_order': 'Orders in progrees. Please complete or cancel before submitting a new order.',
            'invalid_balance': 'Insufficient balance',
            'pubkey_existed': 'An existing validator is found, please check again to avoid double-signature penalty.',
            'pubkey_unhandle_status': 'Validator already exited, can not be uploaded.',
            'seed_existed': 'The mnemonic phrase has already been used in another address. Please choose another one.',
            'over_max_validator_size_per_order': 'The maximum number of validator nodes allowed is 100.',
            'wrong_unfinished_order_size': 'There are multiple orders in progrees. Please contact customer service.',
            'validator_order_uncancelable_canceled': 'Order invalid/cancelled',
            'validator_order_uncancelable_canceling': 'Order is being canceled, please do not submit again',
            'validator_order_uncancelable_staking': 'Order is under staking and unable to cancel',
            'validator_order_uncancelable_finished': 'Order is completed and unable to cancel',
            'validator_order_uncancelable_validator_staked': 'Existing staked validator is found and unable to cancel',
            'validator_order_finished_and_wait': 'It will take around %s until your deposit is processed by the beacon chain. This validator will be eligible for activation once the deposited amount sums up to 32 ETH.',
            'invalid_validator_id': 'Error',
            'invalid_validator_inner_status': 'Error',
            'invalid_validator_order_status': 'Error',
            'invalid_data': 'Invalid data',
            'invite_code_not_exists': 'Invitation code not exists',
            'validator_not_exist': 'Validator not exists',
            'validator_already_exit': 'Validator is exiting or already exited',
            'validator_no_need_exit': "Validator doesn't need exit",
            'validator_deposit_done': 'Complete validator deposit',
            'validator_activation': 'Validator activation',
            'validator_exit_submit': 'Submit validator exit',
            'validator_exited_done': 'Validator exited',
            'validator_withdrawal_done': 'withdrawal done',
            'validator_estimate_withdrawal_time': 'estimate withdrawal done',
            'validator_estimate_exit_time': 'estimate exit done',
            'too_many_requests': 'too many requests, please try again later',
            'customer_not_exist': "customer not exists",
            'username_mismatch': 'username mismatch',
            'old_pass_error': 'old password error',
            'new_pass_invalid': 'new password invalid',
            'old_new_pass_same': 'The old and new passwords cannot be the same',
            'not_in_ssv_whitelist': "Not in the whitelist, please contact the administrator",
            'ef_value_invalid ': 'EF value is less than 0',
            'invalid_validator_type': 'Invalid validator type',
            'deposit_pubkey_not_match': 'The pubkey in the deposit does not match the pubkey in the request',
            'amount_invalid': 'Amount validation failed',
            'validator_info_failed': 'Validator info get failed',
            'validator_not_active_256_epochs_enough': 'Validator not active 256 epochs enough',
            'validator_must_be_0x02_type': 'Validator must be 0x02 type',
            'latest_epoch_get_failed': 'Latest epoch get failed',
            'deposit_invalid': 'Deposit validation failed',
            'withdrawal_data_invalid': 'Withdrawal data validation failed',
            'tx_hash_already_exists': 'Tx hash already exists',
            'validator_topup_funds': 'Topup funds',
            'validator_system_deposit': 'System deposit',
            'validator_partial_withdrawal': 'Partial withdrawal',
            'contract_paused': 'Contract is paused, please try again later',
            'internal_invalid_token': 'Invalid token',
            'stvault_creation_paused': 'StVault creation is paused, please try again later',
            'stvault_info_request_failed': 'StVault info request failed',
            'stvault_not_exist': 'Vault does not exist',
            'forbidden': 'You do not have permission to perform this action',
        },
        'zh': {
            'success': '成功',
            'system_error': '请稍后重试',
            'invalid_params': '参数错误, 请检查',
            'invalid_token': '钱包连接无效, 请重新连接',
            'invalid_captcha': '无效验证码, 请重新获取',
            'invalid_email': '邮箱格式不正确, 请检查邮箱格式',
            'invalid_reward_address': '提现地址格式不正确, 清指定提现地址',
            'send_email_fail': '邮件发送失败, 请稍后重试',
            'low_claimable_balance': '可提现金额不足',
            'over_claim_times': '已达今日提现次数上限, 请明日再试',
            'unstakable_order': '您的节点已经质押，无法获取质押数据',
            'mismatch_reward_address': '地址不匹配, 请检查钱包地址',
            'not_found': '未找到数据, 请检查请求',
            'too_many_unfinishe_order': '有未完成的质押, 不允许创建新质押, 请先完成已有的质押',
            'invalid_balance': '钱包余额不足, 请检查余额',
            'pubkey_existed': '发现已存在的验证者, 请检查, 避免双签惩罚',
            'pubkey_unhandle_status': '验证者已退出, 无法导入',
            'seed_existed': '该助记词已被其他地址使用，请更换助记词',
            'over_max_validator_size_per_order': '单次验证者创建数量上限为100, 请检查验证者数量',
            'wrong_unfinished_order_size': '存在多个未完成质押, 请联系人工客服处理',
            'validator_order_uncancelable_canceled': '质押不存在或已取消, 请勿重复提交',
            'validator_order_uncancelable_canceling': '质押取消中, 请勿重复提交',
            'validator_order_uncancelable_staking': '质押进行中, 无法取消',
            'validator_order_uncancelable_finished': '质押已完成, 无法取消',
            'validator_order_uncancelable_validator_staked': '质押中存在验证者已质押, 不能取消',
            'validator_order_finished_and_wait': '质押成功。验证者节点已开始排队等待激活, 激活后才能获得收益。基于ETH质押规则, 激活预计需要%s。',
            'invalid_validator_id': '验证者节点不存在',
            'invalid_validator_inner_status': '内部状态异常, 请检查后重新提交',
            'invalid_validator_order_status': '质押状态异常',
            'invalid_data': '无效的数据',
            'invite_code_not_exists': '邀请码不存在',
            'validator_not_exist': '节点不存在',
            'validator_already_exit': '节点已经申请退出或者已经退出',
            'validator_no_need_exit': '节点不需要退出',
            'validator_deposit_done': '完成节点质押',
            'validator_activation': '节点激活',
            'validator_exit_submit': '提交退出',
            'validator_exited_done': '完成退出',
            'validator_withdrawal_done': '提现完成',
            'validator_estimate_withdrawal_time': '预计提现完成',
            'validator_estimate_exit_time': '预计退出完成',
            'too_many_requests': '请求过于频繁，清稍后再试',
            'customer_not_exist': "用户不存在",
            'username_mismatch': '用户名不匹配',
            'old_pass_error': '旧密码错误',
            'new_pass_invalid': '新密码不合法',
            'old_new_pass_same': '新旧密码不能相同',
            'not_in_ssv_whitelist': "不在白名单，请联系管理员",
            'ef_value_invalid ': 'EF值无效',
            'invalid_validator_type': '验证者类型不对',
            'deposit_pubkey_not_match': '传入的pubkey和deposit里的pubkey不匹配',
            'amount_invalid': 'Amount数量校验未通过',
            'validator_info_failed': '验证者信息获取失败',
            'validator_not_active_256_epochs': '验证者未活跃够256个epoch',
            'validator_must_be_0x02_type': '验证者必须是0x02类型',
            'latest_epoch_get_failed': '最新epoch获取失败',
            'deposit_invalid': 'deposit验证失败',
            'withdrawal_data_invalid': '提现数校验失败',
            'tx_hash_already_exists': '交易hash已存在',
            'validator_topup_funds': '增量质押',
            'validator_system_deposit': '系统质押',
            'validator_partial_withdrawal': '部分提现',
            'contract_paused': '合约已暂停, 请稍后重试',
            'internal_invalid_token': '无效的token',
            'stvault_creation_paused': 'StVault创建已暂停, 请稍后重试',
            'stvault_info_request_failed': 'StVault数据获取失败',
            'stvault_not_exist': 'Vault不存在',
            'forbidden': '无权执行此操作',
        }
    }

    CODE_DICT = {
        200: 'SUCCESS',
        400: 'INVALID_PARAMS',
        401: 'INVALID_TOKEN',
        402: 'PUBKEY_EXISTED',
        403: 'MISMATCH_REWARD_ADDRESS',
        500: 'SYSTEM_ERROR',
        600: 'CONTRACT_PAUSED'
    }

    def __init__(self, code: int, msg: str, data: object = None, success: bool = True):
        self.code = code
        self.msg = msg
        self.data = data
        self.success = success

    @classmethod
    def get_msg(cls, code, language='en', other_msgs=[], request = None):
        """
        根据code和语言, 获取提示语, 并拼接其他内容
        """
        if language not in ['en', 'zh']:
            if language.lower().startswith('zh'):
                language = 'zh'
            elif language.lower().startswith('en'):
                language = 'en'
            elif 'zh' in language.lower() or 'cn' in language.lower():
                language = 'zh'
            else:
                language = 'en'
        if code != 'success':
            logger.warning('request fail, %s', code)
            if request:
                logger.warning('request.method: %s', request.method)
                logger.warning('request.path: %s', request.path)
                logger.warning('request.headers: %s', request.headers)
                logger.warning('request ip: %s', request.META.get('REMOTE_ADDR'))
                if hasattr(request, 'data'):
                    logger.warning('request.data: %s', request.data)
                logger.warning('request.GET: %s', request.GET)
                logger.warning('request.POST: %s', request.POST)
                logger.warning('request.META: %s', request.META)
        msg = cls.MESSAGE_DICT[language].get(code)
        msg = msg or 'unknow msg'
        return ','.join([str(m) for m in [msg] + other_msgs])


Success = Result(code=200, msg=Result.get_msg('success', 'en', []), success=True)
Failure = Result(code=400, msg="Failure", success=False)
