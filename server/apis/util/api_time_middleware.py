"""
计算每个接口请求时长
"""
import time
import logging
from django.utils.deprecation import MiddlewareMixin


class ApiTimeMiddleware(MiddlewareMixin):
    """
    记录api用时
    """

    def process_request(self, request):
        """
        请求, 中间件从上到下先走process_request, 目前先打点记录请求进入时间戳
        :param request: 请求对象
        :return: None
        """
        request.start_time = time.time()

    def process_response(self, request, response):
        """
        响应, 中间件倒序执行 process_response
        :param request: 请求对象
        :param response: 响应对象
        :return: 响应对象
        """
        total_time = time.time() - request.start_time
        path = request.get_full_path()
        # 增加响应头（可以加也可以不加）
        response["X-Page-Duration-ms"] = int(total_time * 1000)
        logging.info({'request_path': path, 'total_time': total_time})
        if int(total_time * 1000) > 500:
            logging.warning({'request_path': path, 'total_time': total_time})
        return response
