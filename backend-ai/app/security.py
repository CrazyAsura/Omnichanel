import hmac


MIN_SERVICE_TOKEN_LENGTH = 32


def is_valid_service_token(candidate: str | None, configured: str | None) -> bool:
    if not candidate or not configured or len(configured) < MIN_SERVICE_TOKEN_LENGTH:
        return False
    return hmac.compare_digest(candidate.encode("utf-8"), configured.encode("utf-8"))


def require_service_token_configuration(configured: str | None) -> None:
    if not configured or len(configured) < MIN_SERVICE_TOKEN_LENGTH:
        raise RuntimeError("SERVICE_AUTH_TOKEN must contain at least 32 characters")
