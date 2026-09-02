from app.core.password_policy import (
    PasswordRequirement,
    describe_missing_requirements,
    is_strong_password,
    missing_requirements,
)


def test_password_shorter_than_8_chars_is_rejected():
    assert PasswordRequirement.MIN_LENGTH in missing_requirements("Abc@12")
    assert is_strong_password("Abc@12") is False


def test_password_without_uppercase_is_rejected():
    assert PasswordRequirement.UPPERCASE in missing_requirements("abcdef@123")
    assert is_strong_password("abcdef@123") is False


def test_password_without_special_character_is_rejected():
    assert PasswordRequirement.SPECIAL_CHARACTER in missing_requirements("Abcdef123")
    assert is_strong_password("Abcdef123") is False


def test_password_with_fewer_than_3_numbers_is_rejected():
    assert PasswordRequirement.MIN_NUMBERS in missing_requirements("Abcdef@1")
    assert is_strong_password("Abcdef@1") is False


def test_password_with_exactly_3_numbers_is_accepted_if_other_rules_met():
    assert is_strong_password("Abcd@123") is True


def test_password_with_more_than_3_numbers_is_accepted_if_other_rules_met():
    assert is_strong_password("Teste#987654") is True


def test_password_with_exactly_8_chars_is_accepted_if_other_rules_met():
    password = "Ab1@2345"
    assert len(password) == 8
    assert is_strong_password(password) is True


def test_long_valid_password_is_accepted():
    assert is_strong_password("UmaSenhaBemLongaComTudo@12345678") is True


def test_unicode_characters_count_as_length_but_not_as_upper_special_or_digit_requirements():
    # RN: a política não bloqueia Unicode (seção 5 do prompt) — mas emoji/
    # ideogramas não contam como maiúscula/especial/dígito ASCII; a senha
    # ainda precisa ter os 4 requisitos "de verdade" em algum ponto dela.
    assert is_strong_password("Senha@123🎉") is True  # já tem tudo, emoji é só bônus
    assert is_strong_password("あいうえお@123") is False  # sem maiúscula ASCII


def test_multiple_missing_requirements_are_all_reported():
    # 8 letras minúsculas: atende o comprimento mínimo, mas falha nos
    # outros 3 requisitos ao mesmo tempo.
    missing = missing_requirements("abcdefgh")
    assert PasswordRequirement.MIN_LENGTH not in missing
    assert PasswordRequirement.UPPERCASE in missing
    assert PasswordRequirement.SPECIAL_CHARACTER in missing
    assert PasswordRequirement.MIN_NUMBERS in missing
    assert len(missing) == 3


def test_missing_requirements_returns_empty_list_for_strong_password():
    assert missing_requirements("Projeto@123") == []


def test_describe_missing_requirements_lists_every_missing_rule_in_canonical_order():
    message = describe_missing_requirements(
        [PasswordRequirement.MIN_NUMBERS, PasswordRequirement.MIN_LENGTH]
    )
    # Ordem canônica (MIN_LENGTH antes de MIN_NUMBERS), independente da
    # ordem recebida.
    assert message == "A senha deve ter pelo menos 8 caracteres; pelo menos 3 números."


# Casos do próprio prompt (seção 12), conferidos contra a definição real de
# caractere especial (string.punctuation).
def test_prompt_example_cases():
    assert is_strong_password("abcdefg") is False
    assert is_strong_password("Abcdefgh") is False
    assert is_strong_password("Abcdef@1") is False
    assert is_strong_password("abcdef@123") is False
    assert is_strong_password("Abcdef123") is False
    assert is_strong_password("Abcd@123") is True
    assert is_strong_password("Projeto@123") is True
    assert is_strong_password("Teste#987654") is True
