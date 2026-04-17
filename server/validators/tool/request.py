import requests
import inspect
from validators.tool.logger import logger

class Request():
    @classmethod
    def get(cls, url, headers=None, data=None, timeout=60):
        try:
            if headers is None:
                headers = {"Content-Type": "application/json; charset=utf-8"}
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()  # 检查响应状态码
            return response.json()       # 返回JSON格式的响应数据
        except requests.exceptions.RequestException as e:
            # 请求失败，打印错误信息并返回空字典
            caller_frame = inspect.currentframe().f_back
            caller_function_name = caller_frame.f_code.co_name
            logger.error(f"=====请求异常====函数名为：{caller_function_name}\nURL：{url}")
            logger.error(e)
            return None

    @classmethod
    def post(cls, url, headers=None, data=None, json=None, timeout=10):
        try:
            if headers is None:
                headers = {"Content-Type": "application/json; charset=utf-8"}
            response = requests.post(url, headers=headers, data=data, json=json, timeout=timeout)
            response.raise_for_status()  # 检查响应状态码
            return response.json()       # 返回JSON格式的响应数据
        except requests.exceptions.RequestException as e:
            # 请求失败，打印错误信息并返回空字典
            caller_frame = inspect.currentframe().f_back
            caller_function_name = caller_frame.f_code.co_name
            logger.error(f"=====请求异常====函数名为：{caller_function_name}\nURL：{url}\n数据：{data}")
            logger.error(e)
            return None
