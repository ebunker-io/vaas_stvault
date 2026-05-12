"""
Lightweight per-(scope, identifier) fixed-window rate limiter backed by
the Django cache. Used to protect auth / captcha endpoints from
brute-force, enumeration, and DB-flooding abuse.

Note: this uses fixed windows (not sliding); two adjacent windows can let
a burst through. That's fine for the threat model here (slowing down
abuse, not adversarial DoS) and keeps the implementation O(1).
"""
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)


def is_allowed(scope: str, identifier: str, limit: int, window_seconds: int) -> bool:
    """
    Return True if the caller is allowed, False if rate-limited.

    Fail-open: if the cache backend errors (memcached down, etc.) we allow
    the request and log a warning. Taking down auth because the cache is
    flaky would be worse than briefly missing enforcement.
    """
    key = f'rate-limit:{scope}:{identifier}'
    try:
        if cache.add(key, 1, window_seconds):
            return True
        try:
            count = cache.incr(key)
        except ValueError:
            # Key expired between add() and incr(); treat as a fresh window.
            cache.set(key, 1, window_seconds)
            return True
        return count <= limit
    except Exception as e:
        logger.warning('rate-limit cache error scope=%s id=%s: %s', scope, identifier, e)
        return True


def client_ip(request) -> str:
    """
    Trusted source IP for rate-limit bucketing. Uses REMOTE_ADDR only —
    HTTP_X_FORWARDED_FOR is client-spoofable and would let attackers
    rotate buckets at will. If running behind a reverse proxy, that
    proxy must overwrite REMOTE_ADDR, not just append XFF.
    """
    return request.META.get('REMOTE_ADDR', '') or 'unknown'
