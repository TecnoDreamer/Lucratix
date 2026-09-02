// Espelho em pt-BR-neutro (sem strings, só lógica) da política de senha
// forte do backend (`apps/api/app/core/password_policy.py`) — MESMOS
// requisitos, na MESMA ordem canônica. Usado só para feedback em tempo real
// (checklist) durante a digitação; o backend é sempre a autoridade — uma
// chamada direta à API nunca contorna esta validação (ver
// docs/security/POLITICA_DE_SENHAS.md).
//
// Qualquer mudança de requisito precisa ser espelhada nos dois arquivos.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MIN_NUMBERS = 3;

// Mesma definição de "caractere especial" do backend: qualquer símbolo
// ASCII imprimível que não é letra nem dígito (equivalente a
// `string.punctuation` do Python) — construído a partir do range de
// código, não de um literal com os símbolos escritos à mão, para não
// depender de como o editor lida com caracteres especiais no próprio
// arquivo-fonte.
function buildSpecialCharacterSet(): Set<string> {
  const chars = new Set<string>();
  for (let code = 0x21; code <= 0x7e; code++) {
    const char = String.fromCharCode(code);
    if (!/[A-Za-z0-9]/.test(char)) chars.add(char);
  }
  return chars;
}

const SPECIAL_CHARACTERS = buildSpecialCharacterSet();

export type PasswordRequirementKey = "minLength" | "uppercase" | "specialCharacter" | "minNumbers";

// Ordem canônica de exibição — mesma ordem de `_REQUIREMENT_ORDER` no backend.
export const PASSWORD_REQUIREMENTS: PasswordRequirementKey[] = [
  "minLength",
  "uppercase",
  "specialCharacter",
  "minNumbers",
];

function hasUppercase(password: string): boolean {
  return password !== password.toLowerCase();
}

function hasSpecialCharacter(password: string): boolean {
  return [...password].some((char) => SPECIAL_CHARACTERS.has(char));
}

function countDigits(password: string): number {
  return [...password].filter((char) => char >= "0" && char <= "9").length;
}

/** Status atendido/não-atendido de cada requisito, na ordem canônica —
 * usado pelo checklist em tempo real (`PasswordRequirementsChecklist`). */
export function checkPasswordRequirements(password: string): Record<PasswordRequirementKey, boolean> {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: hasUppercase(password),
    specialCharacter: hasSpecialCharacter(password),
    minNumbers: countDigits(password) >= PASSWORD_MIN_NUMBERS,
  };
}

export function isStrongPassword(password: string): boolean {
  const status = checkPasswordRequirements(password);
  return PASSWORD_REQUIREMENTS.every((key) => status[key]);
}
