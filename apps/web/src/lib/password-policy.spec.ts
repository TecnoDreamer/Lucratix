import { describe, expect, it } from "vitest";
import { checkPasswordRequirements, isStrongPassword, PASSWORD_REQUIREMENTS } from "./password-policy";

describe("checkPasswordRequirements", () => {
  it("marca minLength como não atendido com menos de 8 caracteres", () => {
    expect(checkPasswordRequirements("Abc@12").minLength).toBe(false);
  });

  it("marca uppercase como não atendido sem nenhuma letra maiúscula", () => {
    expect(checkPasswordRequirements("abcdef@123").uppercase).toBe(false);
  });

  it("marca specialCharacter como não atendido sem símbolo especial", () => {
    expect(checkPasswordRequirements("Abcdef123").specialCharacter).toBe(false);
  });

  it("marca minNumbers como não atendido com menos de 3 dígitos", () => {
    expect(checkPasswordRequirements("Abcdef@1").minNumbers).toBe(false);
  });

  it("exatamente 3 números atende minNumbers (não é preciso mais que 3)", () => {
    expect(checkPasswordRequirements("Abcd@123").minNumbers).toBe(true);
  });

  it("todos os requisitos aparecem na ordem canônica", () => {
    expect(PASSWORD_REQUIREMENTS).toEqual(["minLength", "uppercase", "specialCharacter", "minNumbers"]);
  });
});

describe("isStrongPassword", () => {
  it.each([
    ["abcdefg", false],
    ["Abcdefgh", false],
    ["Abcdef@1", false],
    ["abcdef@123", false],
    ["Abcdef123", false],
    ["Abcd@123", true],
    ["Projeto@123", true],
    ["Teste#987654", true],
  ])("%s -> %s", (password, expected) => {
    expect(isStrongPassword(password)).toBe(expected);
  });

  it("não bloqueia Unicode — emoji/acentos não atrapalham quando os outros requisitos já são atendidos", () => {
    expect(isStrongPassword("Senha@123🎉")).toBe(true);
  });

  it("Unicode sem letra maiúscula ASCII/Unicode continua inválido", () => {
    expect(isStrongPassword("あいうえお@123")).toBe(false);
  });

  it("senha longa válida é aceita", () => {
    expect(isStrongPassword("UmaSenhaBemLongaComTudo@12345678")).toBe(true);
  });
});
