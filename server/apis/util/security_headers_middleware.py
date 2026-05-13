"""
注入安全相关响应头。
Django 内置 SecurityMiddleware 已覆盖 X-Content-Type-Options / Referrer-Policy /
HSTS / X-Frame-Options 等，这里补充它不覆盖的 Permissions-Policy。
"""
from django.utils.deprecation import MiddlewareMixin


PERMISSIONS_POLICY = (
    "accelerometer=(), autoplay=(), camera=(), display-capture=(), "
    "encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), "
    "magnetometer=(), microphone=(), midi=(), payment=(), "
    "picture-in-picture=(), publickey-credentials-get=(), "
    "screen-wake-lock=(), sync-xhr=(self), usb=(), web-share=(), "
    "xr-spatial-tracking=()"
)


class SecurityHeadersMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        response.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        return response
