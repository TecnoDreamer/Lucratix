"""Política de senha forte — fonte única de verdade no backend.

Toda rota que define uma senha nova (`/register`, `/password-reset/confirm`,
`/change-password` — ver `app/modules/auth/router.py`) chama
`missing_requirements`/`describe_missing_requirements` daqui antes de
persistir. O frontend replica a MESMA lista de requisitos, na mesma ordem,
em `apps/web/src/lib/password-policy.ts` (só para feedback em tempo real —
o backend é sempre a autoridade; uma chamada direta à API nunca contorna
esta validação).

Validação legível por requisito (em vez de uma regex monolítica) de
propósito: cada requisito é uma checagem isolada e testável, e o chamador
sabe exatamente quais faltam — não só "senha inválida".
"""

import string
from enum import StrEnum

# RN: mínimo de 8, sem máximo pequeno arbitrário (seção 5 do prompt de
# política de senha) — 255 é generoso o bastante pra nunca truncar uma
# senha de verdade, mas evita que alguém envie um payload gigante só pra
# forçar o custo computacional do Argon2 (RNF de disponibilidade). Mesmo
# limite já usado nos schemas (`UserRegister`/`PasswordChange`/
# `PasswordResetConfirm`, ver app/schemas/user.py) — mantido lá também
# como defesa em profundidade (corta o payload antes mesmo de chegar aqui).
MIN_LENGTH = 8
MAX_LENGTH = 255
MIN_NUMBERS = 3

# Definição precisa de "caractere especial": qualquer símbolo ASCII
# imprimível que não é letra nem dígito — exatamente `string.punctuation`
# da stdlib (!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~). Documentado também em
# docs/security/POLITICA_DE_SENHAS.md; qualquer mudança aqui precisa ser
# espelhada nos dois lugares (e em lib/password-policy.ts, no frontend).
SPECIAL_CHARACTERS = string.punctuation


class PasswordRequirement(StrEnum):
    MIN_LENGTH = "MIN_LENGTH"
    UPPERCASE = "UPPERCASE"
    SPECIAL_CHARACTER = "SPECIAL_CHARACTER"
    MIN_NUMBERS = "MIN_NUMBERS"


# Ordem canônica de exibição — mesma ordem do checklist no frontend
# (lib/password-policy.ts::PASSWORD_REQUIREMENTS).
_REQUIREMENT_ORDER: tuple[PasswordRequirement, ...] = (
    PasswordRequirement.MIN_LENGTH,
    PasswordRequirement.UPPERCASE,
    PasswordRequirement.SPECIAL_CHARACTER,
    PasswordRequirement.MIN_NUMBERS,
)

_REQUIREMENT_MESSAGES: dict[PasswordRequirement, str] = {
    PasswordRequirement.MIN_LENGTH: f"pelo menos {MIN_LENGTH} caracteres",
    PasswordRequirement.UPPERCASE: "pelo menos uma letra maiúscula",
    PasswordRequirement.SPECIAL_CHARACTER: "pelo menos um caractere especial",
    PasswordRequirement.MIN_NUMBERS: f"pelo menos {MIN_NUMBERS} números",
}


def missing_requirements(password: str) -> list[PasswordRequirement]:
    """Requisitos não atendidos, na ordem canônica — lista vazia = senha forte.

    RN: são 3 OU MAIS dígitos (>= 3), nunca "exatamente 3" — uma senha com 4,
    5 ou mais números continua válida.
    """
    missing: list[PasswordRequirement] = []
    if len(password) < MIN_LENGTH:
        missing.append(PasswordRequirement.MIN_LENGTH)
    if not any(char.isupper() for char in password):
        missing.append(PasswordRequirement.UPPERCASE)
    if not any(char in SPECIAL_CHARACTERS for char in password):
        missing.append(PasswordRequirement.SPECIAL_CHARACTER)
    if sum(char.isdigit() for char in password) < MIN_NUMBERS:
        missing.append(PasswordRequirement.MIN_NUMBERS)
    return missing


def is_strong_password(password: str) -> bool:
    return not missing_requirements(password)


def describe_missing_requirements(missing: list[PasswordRequirement]) -> str:
    """Mensagem única e legível listando TODOS os requisitos que faltam de
    uma vez — nunca só o primeiro (seção 3/4 do prompt: "quando vários
    requisitos falharem, permita mostrar todos"). Usada como `detail` de
    um `HTTPException` simples (string), não como um contrato JSON
    estruturado — mesmo padrão de erro já usado em todo o resto de
    `app/modules/auth/router.py` (ex.: "Token invalido ou expirado"), que o
    frontend já sabe exibir via `ApiError.message` (ver apps/web/src/lib/api.ts).
    """
    ordered = [r for r in _REQUIREMENT_ORDER if r in missing]
    details = "; ".join(_REQUIREMENT_MESSAGES[r] for r in ordered)
    return f"A senha deve ter {details}."
