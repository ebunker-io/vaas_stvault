"""
JSON-RPC proxy for the front-end.

Holds upstream provider keys (e.g. Alchemy) on the server so the dApp bundle
never ships them to the browser. Only forwards a strict allowlist of
read-only Ethereum JSON-RPC methods.
"""
import json
import logging

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)

# Read-only methods needed by viem/wagmi for browsing. Signing happens in the
# user's wallet, not via this proxy, so write methods are intentionally absent.
RPC_METHOD_ALLOWLIST = frozenset({
    'eth_chainId',
    'eth_blockNumber',
    'eth_getBalance',
    'eth_getCode',
    'eth_getStorageAt',
    'eth_getTransactionCount',
    'eth_call',
    'eth_estimateGas',
    'eth_gasPrice',
    'eth_feeHistory',
    'eth_maxPriorityFeePerGas',
    'eth_getLogs',
    'eth_getBlockByNumber',
    'eth_getBlockByHash',
    'eth_getTransactionByHash',
    'eth_getTransactionReceipt',
    'eth_getTransactionByBlockNumberAndIndex',
    'eth_getTransactionByBlockHashAndIndex',
    'eth_getBlockTransactionCountByNumber',
    'eth_getBlockTransactionCountByHash',
    'eth_syncing',
    'net_version',
    'web3_clientVersion',
})

RPC_RATE_LIMIT = 60       # max requests per IP per window
RPC_RATE_WINDOW = 60      # seconds
RPC_UPSTREAM_TIMEOUT = 10 # seconds
RPC_MAX_BATCH = 20        # max methods per batch


def _client_ip(request):
    return request.META.get('REMOTE_ADDR', '') or 'unknown'


def _rate_limit_ok(ip):
    """Fixed-window per-IP counter. Fails open if the cache is unavailable."""
    key = f'rpc-proxy:rate:{ip}'
    try:
        if cache.add(key, 1, RPC_RATE_WINDOW):
            return True
        try:
            count = cache.incr(key)
        except ValueError:
            cache.set(key, 1, RPC_RATE_WINDOW)
            return True
        return count <= RPC_RATE_LIMIT
    except Exception as e:
        logger.warning(f'RPC proxy rate-limit cache error: {e}')
        return True


def _jsonrpc_error(req_id, code, message):
    return {'jsonrpc': '2.0', 'id': req_id, 'error': {'code': code, 'message': message}}


@method_decorator(csrf_exempt, name='dispatch')
class _RpcProxyView(View):
    """Forwards Ethereum JSON-RPC requests to a configured upstream provider.
    Subclasses set `upstream_setting_key` to point at the relevant Django setting."""

    upstream_setting_key = ''

    def post(self, request, *args, **kwargs):
        upstream = getattr(settings, self.upstream_setting_key, '') or ''
        if not upstream:
            logger.error(f'RPC proxy upstream not configured: {self.upstream_setting_key}')
            return JsonResponse(_jsonrpc_error(None, -32603, 'Proxy not configured'), status=503)

        ip = _client_ip(request)
        if not _rate_limit_ok(ip):
            logger.warning(f'RPC proxy rate-limited ip={ip}')
            return JsonResponse(_jsonrpc_error(None, -32005, 'Too many requests'), status=429)

        try:
            body = json.loads(request.body or b'{}')
        except json.JSONDecodeError:
            return JsonResponse(_jsonrpc_error(None, -32700, 'Parse error'), status=400)

        is_batch = isinstance(body, list)
        items = body if is_batch else [body]

        if is_batch and len(items) > RPC_MAX_BATCH:
            return JsonResponse(_jsonrpc_error(None, -32600, 'Batch too large'), status=400)

        for item in items:
            if not isinstance(item, dict):
                return JsonResponse(_jsonrpc_error(None, -32600, 'Invalid request'), status=400)
            method = item.get('method')
            if not isinstance(method, str) or method not in RPC_METHOD_ALLOWLIST:
                return JsonResponse(
                    _jsonrpc_error(item.get('id'), -32601, f'Method not allowed: {method}'),
                    status=403,
                )

        try:
            upstream_resp = requests.post(
                upstream,
                json=body,
                timeout=RPC_UPSTREAM_TIMEOUT,
                headers={'Content-Type': 'application/json'},
            )
        except requests.RequestException as e:
            logger.error(f'RPC proxy upstream request failed: {e}')
            return JsonResponse(_jsonrpc_error(None, -32603, 'Upstream error'), status=502)

        try:
            payload = upstream_resp.json() if upstream_resp.content else None
        except ValueError:
            logger.error(f'RPC proxy upstream returned non-JSON status={upstream_resp.status_code}')
            return JsonResponse(_jsonrpc_error(None, -32603, 'Upstream error'), status=502)

        return JsonResponse(payload, status=upstream_resp.status_code, safe=False)


class RpcProxyMainnetView(_RpcProxyView):
    upstream_setting_key = 'RPC_MAINNET_UPSTREAM'


class RpcProxyHoodiView(_RpcProxyView):
    upstream_setting_key = 'RPC_HOODI_UPSTREAM'
