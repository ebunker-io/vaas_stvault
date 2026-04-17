import logging
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apis.results import Result
from apis import utils
from validators.models import Customer
from django.conf import settings
from rest_framework.renderers import JSONRenderer

logger = logging.getLogger(__name__)
from enum import Enum

class REQUEST_TYPE(Enum):
    GET = 'GET'
    POST = 'POST'
    PUT = 'PUT'
    DELETE = 'DELETE'

class BaseApiView(APIView):
    """
    通用 API 基类，统一处理异常、参数验证、登录验证、响应构建等通用逻辑
    所有 APIView 都可以继承此类
    """
    # 类属性：是否要求登录验证（子类可以覆盖）
    require_auth = True
    # 类属性：是否允许观察者（子类可以覆盖）
    allow_observer = True

    def ensure_json_response(self, response, request=None, *args, **kwargs):
        """
        确保 Response 是 JSON 格式
        用于在直接返回 Response 时（不经过 finalize_response）确保格式正确
        :param response: Response 对象
        :param request: 请求对象（可选，用于设置 renderer_context）
        :param args: 位置参数（可选，用于设置 renderer_context）
        :param kwargs: 关键字参数（可选，用于设置 renderer_context）
        :return: 确保格式正确的 Response 对象
        """
        if isinstance(response, Response):
            try:
                # 强制使用 JSON 渲染器
                response.accepted_renderer = JSONRenderer()
                response.accepted_media_type = 'application/json'
                # 强制设置 content_type
                response['Content-Type'] = 'application/json'
                # 设置 renderer_context（DRF 的 Response.rendered_content 需要这个）
                if request is not None:
                    response.renderer_context = {
                        'view': self,
                        'request': request,
                        'args': args,
                        'kwargs': kwargs,
                    }
            except Exception as e:
                logger.warning(f"Failed to set JSON renderer in ensure_json_response: {e}")
                try:
                    response['Content-Type'] = 'application/json'
                except Exception:
                    pass
        return response

    def dispatch(self, request, *args, **kwargs):
        """
        重写 dispatch 方法，统一处理异常
        确保所有继承自 BaseApiView 的视图类，任何异常都能被捕获并返回 JSON 格式的错误响应
        """
        try:
            # 调用父类的 dispatch，捕获所有可能的异常
            # finalize_response 会统一处理响应格式，确保返回 JSON
            response = super().dispatch(request, *args, **kwargs)
            # 确保返回的响应是 JSON 格式（双重保险）
            return self.ensure_json_response(response, request, *args, **kwargs)
        except Exception as e:
            # 捕获所有异常，包括响应处理过程中的异常
            # 记录详细的异常信息，包括请求路径、方法、异常类型等
            logger.error(
                f"{self.__class__.__name__} dispatch error: {type(e).__name__}: {str(e)} | "
                f"Path: {getattr(request, 'path', 'N/A')} | "
                f"Method: {getattr(request, 'method', 'N/A')}",
                exc_info=True
            )
            # 统一构造 500 错误响应，逻辑集中在一个地方，避免多层 try/except
            error_response = self._build_internal_server_error_response(request)
            return self.ensure_json_response(error_response, request, *args, **kwargs)

    def _build_internal_server_error_response(self, request):
        """
        构造 500 服务异常的 Response，带有兜底逻辑
        优先使用 error_response 获取本地化文案，如果失败则返回最基础的 JSON 包
        """
        try:
            return self.error_response(request, 500, 'system_error')
        except Exception as inner_e:
            logger.error(
                f"{self.__class__.__name__} _build_internal_server_error_response fallback error: {inner_e}",
                exc_info=True
            )
            error_data = {
                "code": 500,
                "msg": "Internal server error",
                "success": False
            }
            return Response(
                error_data,
                status=status.HTTP_200_OK,
                content_type="application/json"
            )

    def verify_auth(self, request):
        """
        验证用户登录（如果 require_auth 为 True）
        :param request: 请求对象
        :return: (is_valid, user_or_response) - (是否有效, 如果有效则返回用户对象，否则返回错误响应)
        """
        if not self.require_auth:
            return True, None

        current_user = utils.verify_token(request, allow_observer=self.allow_observer)
        if not isinstance(current_user, Customer):
            return False, current_user
        return True, current_user

    def validate_params(self, request, required_params: list, custom_error_fields: list = None, request_type: REQUEST_TYPE = REQUEST_TYPE.POST):
        """
        验证请求参数是否齐全
        :param request: 请求对象
        :param required_params: 必需参数列表
        :param custom_error_fields: 自定义错误字段列表（用于错误提示），如果为None则使用required_params
        :param request_type: 请求类型，GET 从 request.GET 获取，其他从 request.data 获取
        :return: (is_valid, items_or_response) - (是否有效, 如果有效则返回数据字典，否则返回错误响应)
        """
        if request_type == REQUEST_TYPE.GET:
            items: dict = request.GET
        else:
            # POST, PUT, PATCH, DELETE 等都从 request.data 获取
            items: dict = request.data

        if not utils.verify_params(items, required_params):
            error_fields = custom_error_fields or required_params
            return False, self.error_response(request, 400, 'invalid_params', error_fields)
        return True, items


    def success_response(self, request, data=None):
        """
        构建成功响应
        :param request: 请求对象
        :param data: 响应数据
        :return: Response对象
        """
        try:
            # 安全获取 Accept-Language
            language = 'en'
            try:
                if hasattr(request, 'headers'):
                    language = request.headers.get('Accept-Language', 'en')
            except Exception:
                pass

            # 安全获取消息
            try:
                msg = Result.get_msg('success', language, [], request)
            except Exception as e:
                logger.warning(f"Result.get_msg failed in success_response: {e}")
                msg = "Success"

            result = Result(
                code=200,
                msg=msg,
                success=True,
                data=data
            )
            # 安全地创建 Response，确保数据可序列化
            try:
                response_data = {
                    'code': result.code,
                    'msg': result.msg,
                    'success': result.success,
                    'data': result.data
                }
                return Response(response_data, status=status.HTTP_200_OK, content_type="application/json")
            except Exception as e:
                logger.error(f"Failed to create Response in success_response: {e}", exc_info=True)
                # 如果创建失败，使用最基本的数据
                return Response(
                    {'code': 200, 'msg': 'Success', 'success': True},
                    status=status.HTTP_200_OK,
                    content_type="application/json"
                )
        except Exception as e:
            # 如果 success_response 失败，记录错误并返回 500 错误响应
            logger.error(f"{self.__class__.__name__} success_response error: {e}", exc_info=True)
            try:
                return self.error_response(request, 500, 'system_error')
            except Exception as inner_e:
                logger.error(
                    f"{self.__class__.__name__} success_response fallback error: {inner_e}",
                    exc_info=True
                )
                error_data = {
                    "code": 500,
                    "msg": "Internal server error",
                    "success": False
                }
                return Response(
                    error_data,
                    status=status.HTTP_200_OK,
                    content_type="application/json"
                )

    def error_response(self, request, code: int, msg_key: str, extra_fields: list = None):
        """
        构建错误响应
        直接返回 Response 对象，finalize_response 会统一处理响应格式
        :param request: 请求对象
        :param code: 错误代码
        :param msg_key: 错误消息键（对应Result.MESSAGE_DICT中的key）
        :param extra_fields: 额外的错误字段列表（用于错误提示）
        :return: Response对象
        """
        try:
            # 安全获取 Accept-Language
            language = 'en'
            try:
                if hasattr(request, 'headers'):
                    language = request.headers.get('Accept-Language', 'en')
            except Exception:
                pass

            # 调用 Result.get_msg，捕获可能的异常
            try:
                msg = Result.get_msg(msg_key, language, extra_fields or [], request)
            except Exception as e:
                logger.error(f"Result.get_msg failed in error_response: {e}", exc_info=True)
                # 使用默认消息
                msg = "An error occurred"

            result = Result(
                code=code,
                msg=msg,
                success=False
            )
            # 安全地创建 Response，确保数据可序列化
            try:
                response_data = {
                    'code': result.code,
                    'msg': result.msg,
                    'success': result.success
                }
                return Response(response_data, status=status.HTTP_200_OK, content_type="application/json")
            except Exception as e:
                logger.error(f"Failed to create Response in error_response: {e}", exc_info=True)
                # 如果创建失败，使用最基本的数据
                return Response(
                    {'code': code, 'msg': 'An error occurred', 'success': False},
                    status=status.HTTP_200_OK,
                    content_type="application/json"
                )
        except Exception as e:
            # 如果 error_response 本身出错，返回一个简单的 JSON 错误响应
            logger.error(f"{self.__class__.__name__} error_response failed: {e}", exc_info=True)
            error_data = {
                "code": code if isinstance(code, int) else 500,
                "msg": "Internal server error",
                "success": False
            }
            return Response(
                error_data,
                status=status.HTTP_200_OK,
                content_type="application/json"
            )


        # 将字典或列表中的指定 Decimal 字段转换为字符串

    def convert_decimal_fields_to_str(self, data, decimal_fields):
        """
        将字典或列表中的指定 Decimal 字段转换为字符串
        null 值转换为 "0"
        :param data: 可以是字典、列表或单个值
        :param decimal_fields: Decimal 字段名集合
        :return: 转换后的数据
        """
        if isinstance(data, dict):
            result = {}
            for key, value in data.items():
                if key in decimal_fields:
                    # Decimal 字段：null 转为 "0"，其他转为字符串
                    if value is None:
                        result[key] = "0"
                    else:
                        result[key] = str(value)
                else:
                    # 非 Decimal 字段：递归处理
                    result[key] = self.convert_decimal_fields_to_str(value, decimal_fields)
            return result
        elif isinstance(data, list):
            return [self.convert_decimal_fields_to_str(item, decimal_fields) for item in data]
        else:
            return data

class InternalApiView(BaseApiView):
    """
    内部服务专用 API 基类 无需登录验证
    要求 IP 白名单或内部 Token 验证（任一通过即可）
    用于限制只能被内部服务或内部 VPN 调用的接口
    """
    # 是否需要登录验证
    require_auth = False
    # 是否要求内部访问验证
    require_internal_access = True

    def get_client_ip(self, request):
        """
        获取客户端真实 IP（考虑代理情况）
        :param request: 请求对象
        :return: 客户端 IP 地址
        """
        try:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0].strip()
            else:
                ip = request.META.get('REMOTE_ADDR', '0.0.0.0')
            return ip
        except Exception as e:
            logger.warning(f"Failed to get client IP: {e}")
            return request.META.get('REMOTE_ADDR', '0.0.0.0')

    def verify_internal_access(self, request):
        """
        验证内部访问（IP 白名单或内部 Token 任一通过即可）
        :param request: 请求对象
        :return: (is_valid, response) - (是否有效, 如果无效则返回错误响应)
        """
        if not self.require_internal_access:
            return True, None

        try:
            # 验证内部服务 Token
            internal_token = getattr(settings, 'INTERNAL_SERVICE_TOKEN', None)
            token_valid = False

            if internal_token:
                # 从请求头获取 Token（支持多种格式）
                auth_header = (
                    request.META.get('HTTP_X_INTERNAL_TOKEN') or
                    request.META.get('HTTP_X_INTERNAL_SERVICE_TOKEN') or
                    request.META.get('HTTP_AUTHORIZATION')
                )

                if auth_header:
                    # 支持 Bearer Token 格式
                    if auth_header.startswith('Bearer '):
                        token = auth_header.split(' ')[1]
                    else:
                        token = auth_header

                    if token == internal_token:
                        token_valid = True

            # Token 验证通过
            if token_valid:
                logger.info(f"Internal API access granted (Token valid: {token_valid})")
                return True, None

            # 验证失败，返回错误响应，由 InternalApiView.dispatch 直接返回
            logger.warning(f"Internal API access denied (Token valid: {token_valid})")
            # 如果 error_response 失败，抛出异常让基类统一处理为 500
            response = self.error_response(request, 401, 'internal_invalid_token')
            return False, response
        except Exception as e:
            # 如果验证过程本身出错，或 error_response 失败，抛出异常让基类统一处理为 500
            logger.error(f"verify_internal_access error: {e}", exc_info=True)
            raise

    def dispatch(self, request, *args, **kwargs):
        """
        重写 dispatch 方法，添加内部访问验证
        验证失败时直接返回 401 错误响应
        如果验证过程出错或创建响应失败，抛出异常让基类统一处理为 500
        """
        # 先验证内部访问（如果出错会抛出异常，由基类统一处理为 500）
        is_valid, response = self.verify_internal_access(request)
        if not is_valid:
            # 验证失败，直接返回 401 错误响应，确保是 JSON 格式
            return self.ensure_json_response(response, request, *args, **kwargs)

        # 调用父类的 dispatch，父类会统一处理异常和响应格式
        return super().dispatch(request, *args, **kwargs)
