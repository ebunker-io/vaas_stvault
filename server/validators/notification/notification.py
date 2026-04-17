import logging
import json
import requests

from django.core import mail
from django.conf import settings
from validators.models.config import Config
from mysite.appconfig import AppConfig
from enum import Enum

from validators.tool.request import Request

logger = logging.getLogger(__name__)


class NotificationType(Enum):
    DAILY_REPORT = 'daily_report'
    HOURLY_REPORT = 'hourly_report'
    NOTICE_REPORT = 'notice_report'
    ALARM_REPORT = 'alarm_report'
    FINANCIAL_REPORT = 'financial_report'


class Notification(object):

    DING_TEMPLATE = {
        'new_order': {
            'title': '【New】订单通知',
            'text': '订单编号: {order_code}<br>验证者数量: {validator_count}<br>收益地址: {reward_address}<br>提示: 请及时部署。'
        },
        'deployed_order': {
            'title': '【Deployed】订单通知',
            'text': '订单编号: {order_code}<br>验证者数量: {validator_count}<br>收益地址: {reward_address}'
        },
        'depositing_order': {
            'title': '【Depositing】订单通知',
            'text': '订单编号: {order_code}<br>验证者数量: {validator_count}<br>收益地址: {reward_address}<br>提示: 请关注质押结果'
        },
        'deposited_order': {
            'title': '【Finished】订单通知',
            'text': '订单编号: {order_code}<br>验证者数量: {validator_count}<br>收益地址: {reward_address}<br>提醒: 风控白名单需确认并更新以避免用户提现失败'
        },
        'deposit_data_verified_false': {
            'title': '【Error】订单通知',
            'text': '订单编号: {order_code}<br>验证者数量: {validator_count}<br>收益地址: {reward_address}<br>提示: deposit_data验证失败, 请检查'
        },
        'deposit_data_verified_true': {
            'title': '【Verified】订单通知',
            'text': '订单编号: {order_code}<br>验证者数量: {validator_count}<br>收益地址: {reward_address}<br>提示: deposit_data验证通过'
        },
        'active_validator': {
            'title': '【Active】节点通知',
            'text': 'Index: {index}<br>pubkey: {pubkey}<br>订单编号: {order_code}<br>收益地址: {reward_address}'
        },
        'validator_status': {
            'title': '【状态变更】节点通知',
            'text': 'Index: {index}<br>pubkey: {pubkey}<br>原状态: {old_status}<br>新状态: {new_status}'
        },
        'new_claim_order': {
            'title': '【New】提现通知',
            'text': '提现数量: {amount}<br>订单编号: {order_code}<br>业务线: {platform}<br>提现地址: {reward_address}<br>时间: {time}'
        },
        'claim_order_success': {
            'title': '【Finished】提现通知',
            'text': '提现数量: {amount}<br>订单编号: {order_code}<br>业务线: {platform}<br>提现地址: {reward_address}<br>时间: {time}'
        },
        'claim_order_fail': {
            'title': '【Fail】提现通知',
            'text': '提现数量: {amount}<br>订单编号: {order_code}<br>业务线: {platform}<br>提现地址: {reward_address}<br>时间: {time}'
        },
        'update_address': {
            'title': '【New】修改收益地址',
            'text': '提现类型: {kind}<br>旧地址: {from}<br>新地址: {to}<br>用户: {reward_address}'
        },
        'new_exit_order': {
            'title': '【申请退出】节点通知',
            'text': '订单: {order}<br>用户: {user}<br>pubkey: {pubkey}<br>时间: {time}'
        },
        'business_data_miss': {
            'title': '【告警】业务数据缺失',
            'text': '类型: {kind}<br>date: {time}<br>请及时检查'
        },
        'unhandled_exception': {
            'title': '【Error】发现服务器未处理异常',
            'text': '错误: {msg}<br>path: {path}<br>method: {method}<br>ip: {ip}<br>header: {header}<br>GET: {GET}<br>POST: {POST}<br>time: {time}'
        },
        'handled_exception': {
            'title': '【Warning】发现服务器已处理异常',
            'text': '错误: {msg}'
        },
        'cluster_balance_too_low': {
            'title': '【Warning】发现低SSV余额cluster',
            'text': '剩余天数: {last_day}<br>用户地址: {reward_address}<br>cluster_id: {cluster_id}'
        },
    }

    @classmethod
    def send_template(cls, temp_code, params, notification_type=NotificationType.NOTICE_REPORT):
        """
        :param temp_code: 模板编码
        :param params: 模板参数
        """
        notification_methods = Config.get_by_key('notification_methods')
        if not notification_methods:
            return
        if 'ding' in notification_methods:
            cls.send_template_ding(temp_code, params, notification_type)
        if 'lark' in notification_methods:
            cls.send_template_lark(temp_code, params, notification_type)

    @classmethod
    def send_template_ding(cls, temp_code, params, notification_type=NotificationType.NOTICE_REPORT):
        """
        :param temp_code: 模板编码
        :param params: 模板参数
        """
        try:
            logger.info('send_template_ding temp_code %s', temp_code)

            data = []
            subject_temp = cls.DING_TEMPLATE[temp_code]['title']
            subject = subject_temp.format(**params)
            content_temp = cls.DING_TEMPLATE[temp_code]['text']
            content = content_temp.format(**params)
            content_line = content.split('<br>')

            data.append('### ' + subject)
            for line in content_line:
                data.append('- ' + line)

            all_data = {
                "msgtype": "markdown",
                "markdown": {
                    "title": subject,
                    "text": "\n".join(data)
                },
            }

            cls.send_ding(all_data, notification_type)
        except Exception as e:
            logger.info('send_template_ding %s', str(e))

    @classmethod
    def send_template_lark(cls, temp_code, params, notification_type=NotificationType.NOTICE_REPORT):
        """
        :param temp_code: 模板编码
        :param params: 模板参数
        """
        try:
            logger.info('send_template_lark temp_code %s', temp_code)

            data = []
            subject_temp = cls.DING_TEMPLATE[temp_code]['title']
            subject = subject_temp.format(**params)
            content_temp = cls.DING_TEMPLATE[temp_code]['text']
            content = content_temp.format(**params)
            content_line = content.split('<br>')

            data.append(subject)
            for line in content_line:
                data.append('- ' + line)

            # 格式化消息
            message = {
                "msg_type": "interactive",
                "card": {
                    "header": {
                        "title": {
                                "content": "【通知】{}".format(data[0]),
                                "tag": "plain_text"
                        }
                    },
                    "elements": [
                        {
                            "tag": "markdown",
                            "text_size": "small",
                            "content": "\n".join(data)
                        }
                    ]
                }
            }
            cls.send_lark(message, notification_type)

        except Exception as e:
            logger.info('send_template_ding %s', str(e))

    @classmethod
    def send_template_email(cls, address_list, temp_code, params):
        """
        发送邮件
        :param address_list: 收件人地址集合
        :param temp_code: 邮件编码
        :param params: 邮件参数
        """
        subject_temp = Config.get_by_key('mail_subject_' + temp_code, "")
        subject = subject_temp.format(**params)
        content_temp = Config.get_by_key('mail_template_' + temp_code, "")
        content = content_temp.format(**params)
        logger.debug("%s,%s,%s", subject, address_list, content)

        cls.send_mail(
            subject=subject,
            message="",
            from_email=settings.EMAIL_FROM,
            recipient_list=address_list,
            html_message=content,
            fail_silently=False,
        )

    @classmethod
    def send_contents(cls, contents, notification_type=NotificationType.NOTICE_REPORT):
        """
        :param contents: 行消息数组
        """
        notification_methods = Config.get_by_key('notification_methods')
        if not notification_methods:
            return
        if 'ding' in notification_methods:
            cls.send_contents_ding(contents, notification_type)
        if 'lark' in notification_methods:
            cls.send_contents_lark(contents, notification_type)

    @classmethod
    def send_contents_ding(cls, contents, notification_type=NotificationType.NOTICE_REPORT):
        """
        :param contents: 行消息数组
        """
        try:
            logger.info('send_contents_ding')

            all_data = {
                "msgtype": "markdown",
                "markdown": {
                    "title": contents[0],
                    "text": "\n".join(contents)
                },
            }

            cls.send_ding(all_data, notification_type)
        except Exception as e:
            logger.info('send_contents_ding %s', str(e))


    @classmethod
    def send_contents_lark(cls, contents, notification_type=NotificationType.NOTICE_REPORT):
        """
        :param contents: 行消息数组
        """
        try:
            logger.info('send_contents_lark')

            # 格式化消息
            message = {
                "msg_type": "interactive",
                "card": {
                    "header": {
                        "title": {
                                "content": "【通知】{}".format(contents[0]),
                                "tag": "plain_text"
                        }
                    },
                    "elements": [
                        {
                            "tag": "markdown",
                            "text_size": "small",
                            "content": "\n".join(contents)
                        }
                    ]
                }
            }
            cls.send_lark(message, notification_type)

        except Exception as e:
            logger.info('send_contents_lark %s', str(e))

    @classmethod
    def send_ding(cls, data, notification_type: NotificationType):
        """
        发送钉钉消息
        """
        logger.info('send_ding %s', data)
        url = cls.ding_url(notification_type)
        enable = AppConfig.value_for_key(AppConfig.DING_ENABLE)
        if not enable:
            return

        json_data = json.dumps(data).encode(encoding="utf-8")

        header_encoding = {'User-Agent': 'Python3.9',
                           "Content-Type": "application/json"}
        res = requests.post(url, data=json_data, headers=header_encoding).json()
        logger.info('res %s', str(res))

    @classmethod
    def send_mail(cls, subject: str, message: str, from_email, recipient_list: list, html_message: str,
                  fail_silently: bool = False):
        logger.info('send_mail %s', message)
        logger.info("%s,%s,%s", subject, recipient_list, html_message)
        enable = settings.EMAIL_SEND_ENABLE
        if not enable:
            return
        mail.send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=fail_silently
        )

    @classmethod
    def ding_url(cls, notification_type: NotificationType):
        url = settings.DING['endpoint'] + settings.DING['secret_access_key']
        try:
            url = settings.DING['endpoint'] + settings.DING['secret_access_keys'][notification_type.value]
        except Exception as e:
            print(e)
            logger.error("ding_url error notification_type")
        print(url)
        return url

    # 发送Lark消息
    @classmethod
    def send_lark(cls, data, notification_type: NotificationType):
        logger.info('send_lark:\n %s', data)
        enable = bool(settings.LARK["enable"])
        if not enable:
            return
        json_data = json.dumps(data).encode(encoding="utf-8")
        headers = {'User-Agent': 'Python3.9', "Content-Type": "application/json; ; charset=utf-8"}
        url = cls.lark_url(notification_type)
        result = Request.post(url, data=json_data, headers=headers)
        logger.info(result)


    @classmethod
    def send_lark_table(cls, title: str, data_list: list, columns: list,
                       notification_type: NotificationType = NotificationType.NOTICE_REPORT,
                       ):
        """
        发送Lark表格消息
        :param title: 消息标题
        :param data_list: 数据列表
        :param columns: 列定义列表，每个元素包含: name(列名), display_name(显示名), width(宽度，可选), data_type(数据类型，可选)
        :param notification_type: 通知类型
        :param row_converter: 行数据转换函数，接收数据项，返回字典 {col_name: value}
        :param page_size: 分页大小
        :param freeze_first_column: 是否冻结第一列
        """
        page_size = 10
        freeze_first_column = False
        try:
            try:
                data_list = list(data_list)
            except (TypeError, ValueError) as e:
                logger.error('send_lark_table: data_list must be iterable, got %s, error: %s', type(data_list), str(e))
                return

            try:
                columns = list(columns)
            except (TypeError, ValueError) as e:
                logger.error('send_lark_table: columns must be iterable, got %s, error: %s', type(columns), str(e))
                return

            rows = []
            for item in data_list:
                row = item if isinstance(item, dict) else {}
                if not isinstance(row, dict):
                    logger.warning('send_lark_table: row must be dict, got %s', type(row))
                    continue
                rows.append(row)

            table_columns = []
            for col in columns:
                if not isinstance(col, dict):
                    continue
                col_def = {
                    "name": col.get("name", ""),
                    "display_name": col.get("display_name", "")
                }
                if "width" in col:
                    col_def["width"] = col["width"]
                if "data_type" in col:
                    col_def["data_type"] = col["data_type"]
                table_columns.append(col_def)

            message = {
                "msg_type": "interactive",
                "card": {
                    "header": {
                        "title": {
                            "content": title,
                            "tag": "plain_text"
                        }
                    },
                    "elements": [
                        {
                            "tag": "table",
                            "page_size": page_size,
                            "freeze_first_column": freeze_first_column,
                            "columns": table_columns,
                            "rows": rows
                        }
                    ]
                }
            }
            cls.send_lark(message, notification_type)
        except Exception as e:
            logger.info('send_lark_table %s', str(e))

    @classmethod
    def lark_url(cls, notification_type: NotificationType):
        url = settings.LARK['endpoint'] + settings.LARK['secret_access_keys']['daily_report']
        try:
            url = settings.LARK['endpoint'] + settings.LARK['secret_access_keys'][notification_type.value]
        except Exception as e:
            logger.error("ding_url error notification_type")
        return url
