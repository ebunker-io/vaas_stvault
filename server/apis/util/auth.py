import logging
from rest_framework import authentication
from rest_framework.request import Request
from aws_requests_auth.aws_auth import AWSRequestsAuth, getSignatureKey
import hmac
import hashlib
import json

from rest_framework import exceptions

from mysite import settings

logger = logging.getLogger(__name__)

class R:
    def __init__(self, url: str):
        self.url = url


class AwsV4SignAuth(authentication.BaseAuthentication):
    def authenticate(self, request: Request):
        logger.info("---authenticate----")

        ACCESS_KEY = settings.AWS['access_key']
        SECRET_ACCESS_KEY = settings.AWS['secret_access_key']

        auth_heard: str = request.META.get('HTTP_AUTHORIZATION')
        algorithm_credential, signed_headers, req_signature = auth_heard.split(",")
        algorithm, credential = algorithm_credential.split(" ")
        credential_key, credential = credential.split("=")
        access_key, datestamp, aws_region, service, aws4_request = credential.split("/")
        req_signature_key, req_signature = req_signature.split("=")

        if access_key != ACCESS_KEY:
            raise exceptions.AuthenticationFailed('Invalidate AwsV4 access_key.')

        amzdate = request.META.get('HTTP_X_AMZ_DATE')
        method = request.META.get('REQUEST_METHOD')
        path = request.META.get('PATH_INFO')
        host = request.META.get('HTTP_HOST')
        url_scheme = request.META.get('wsgi.url_scheme')

        r = R(url="%s://%s%s" % (url_scheme, host, path))
        canonical_uri = AWSRequestsAuth.get_canonical_path(r)

        canonical_querystring = AWSRequestsAuth.get_canonical_querystring(r)

        canonical_headers = ('host:' + host + '\n' +
                             'x-amz-date:' + amzdate + '\n')

        signed_headers = 'host;x-amz-date'

        body = json.dumps(request.data) if request.data else bytes()
        try:
            body = body.encode('utf-8')
        except (AttributeError, UnicodeDecodeError):
            body = body
        payload_hash = hashlib.sha256(body).hexdigest()

        canonical_request = (method + '\n' + canonical_uri + '\n' +
                             canonical_querystring + '\n' + canonical_headers +
                             '\n' + signed_headers + '\n' + payload_hash)
        credential_scope = (datestamp + '/' + aws_region + '/' +
                            service + '/' + 'aws4_request')
        string_to_sign = (algorithm + '\n' + amzdate + '\n' + credential_scope +
                          '\n' + hashlib.sha256(canonical_request.encode('utf-8')).hexdigest())
        string_to_sign_utf8 = string_to_sign.encode('utf-8')

        signing_key = getSignatureKey(SECRET_ACCESS_KEY,
                                      datestamp,
                                      aws_region,
                                      service)

        signature = hmac.new(signing_key,
                             string_to_sign_utf8,
                             hashlib.sha256).hexdigest()

        if signature != req_signature:
            raise exceptions.AuthenticationFailed('Invalidate AwsV4 signature.')
        else:
            return "user", "token"

    def authenticate_header(self, request):
        logger.info("---------authenticate_header-----------")
