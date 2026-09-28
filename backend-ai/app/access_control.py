ROLE_LEVELS = {"EMPLOYEE": 1, "ADMIN": 2, "SUPER_ADMIN": 3}


def normalize_role(role: str | None) -> str:
    normalized = (role or "EMPLOYEE").strip().upper().replace("-", "_")
    return normalized if normalized in ROLE_LEVELS else "EMPLOYEE"


def allowed_document_roles(requester_role: str | None) -> set[str]:
    level = ROLE_LEVELS[normalize_role(requester_role)]
    return {role for role, role_level in ROLE_LEVELS.items() if role_level <= level}


def can_read_document(requester_role: str | None, minimum_role: str | None) -> bool:
    raw_minimum = (minimum_role or "SUPER_ADMIN").strip().upper().replace("-", "_")
    minimum = raw_minimum if raw_minimum in ROLE_LEVELS else "SUPER_ADMIN"
    return ROLE_LEVELS[normalize_role(requester_role)] >= ROLE_LEVELS[minimum]

