ROLE_LEVELS = {"EMPLOYEE": 1, "ADMIN": 2, "SUPER_ADMIN": 3}

# Estrutura de dados: Tabela Hash de lookup estático O(1) com frozensets pré-computados
# Elimina iterações e alocações repetidas de memória a cada verificação de segurança/RAG
_ALLOWED_ROLES_CACHE: dict[str, frozenset[str]] = {
    role: frozenset(
        allowed_role
        for allowed_role, role_level in ROLE_LEVELS.items()
        if role_level <= level
    )
    for role, level in ROLE_LEVELS.items()
}


def normalize_role(role: str | None) -> str:
    normalized = (role or "EMPLOYEE").strip().upper().replace("-", "_")
    return normalized if normalized in ROLE_LEVELS else "EMPLOYEE"


def allowed_document_roles(requester_role: str | None) -> frozenset[str]:
    return _ALLOWED_ROLES_CACHE[normalize_role(requester_role)]


def can_read_document(requester_role: str | None, minimum_role: str | None) -> bool:
    raw_minimum = (minimum_role or "SUPER_ADMIN").strip().upper().replace("-", "_")
    minimum = raw_minimum if raw_minimum in ROLE_LEVELS else "SUPER_ADMIN"
    return ROLE_LEVELS[normalize_role(requester_role)] >= ROLE_LEVELS[minimum]


