import { afterEach, describe, expect, it } from "vitest";
import {
  ACTIVE_ORGANIZATION_STORAGE_KEY,
  accountBackTarget,
  forgetActiveOrganizationId,
  isOrganizationId,
  readStoredActiveOrganizationId,
  rememberActiveOrganizationId,
  resolveActiveOrganization,
} from "./active-organization";
import type { Organization } from "./types";

function fakeOrg(id: string, name = "Empresa"): Organization {
  return {
    id,
    name,
    trade_name: null,
    segment: null,
    cnpj: null,
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    tracking_start_date: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    my_role: "ORGANIZATION_OWNER",
  };
}

const ORG_A = fakeOrg("11111111-1111-1111-1111-111111111111", "Empresa A");
const ORG_B = fakeOrg("22222222-2222-2222-2222-222222222222", "Empresa B");

afterEach(() => {
  window.localStorage.clear();
});

describe("isOrganizationId", () => {
  it("aceita um UUID valido", () => {
    expect(isOrganizationId(ORG_A.id)).toBe(true);
  });

  it("rejeita valores nao-UUID, incluindo tentativas de path traversal/URL", () => {
    expect(isOrganizationId(null)).toBe(false);
    expect(isOrganizationId(undefined)).toBe(false);
    expect(isOrganizationId("")).toBe(false);
    expect(isOrganizationId("//evil.com")).toBe(false);
    expect(isOrganizationId("../../etc/passwd")).toBe(false);
    expect(isOrganizationId("javascript:alert(1)")).toBe(false);
  });
});

describe("resolveActiveOrganization", () => {
  it("prioriza um ?from valido presente na lista de organizacoes do usuario", () => {
    rememberActiveOrganizationId(ORG_B.id);
    const resolved = resolveActiveOrganization([ORG_A, ORG_B], ORG_A.id);
    expect(resolved?.id).toBe(ORG_A.id);
  });

  it("um ?from que nao pertence a lista do usuario (cross-tenant) nunca resolve, mesmo sendo um UUID valido", () => {
    const foreignId = "33333333-3333-3333-3333-333333333333";
    const resolved = resolveActiveOrganization([ORG_A, ORG_B], foreignId);
    expect(resolved).toBeNull();
  });

  it("um ?from malicioso (nao-UUID) e ignorado, cai para o localStorage", () => {
    rememberActiveOrganizationId(ORG_B.id);
    const resolved = resolveActiveOrganization([ORG_A, ORG_B], "//evil.com");
    expect(resolved?.id).toBe(ORG_B.id);
  });

  it("sem ?from, usa o id lembrado em localStorage se ele estiver na lista", () => {
    rememberActiveOrganizationId(ORG_A.id);
    const resolved = resolveActiveOrganization([ORG_A, ORG_B], null);
    expect(resolved?.id).toBe(ORG_A.id);
  });

  it("id lembrado de outro usuario/sessao (fora da lista atual) nao resolve", () => {
    rememberActiveOrganizationId("44444444-4444-4444-4444-444444444444");
    const resolved = resolveActiveOrganization([ORG_A, ORG_B], null);
    expect(resolved).toBeNull();
  });

  it("lista vazia (usuario sem organizacoes) nunca resolve", () => {
    rememberActiveOrganizationId(ORG_A.id);
    const resolved = resolveActiveOrganization([], ORG_A.id);
    expect(resolved).toBeNull();
  });

  it("sem ?from e sem nada salvo, resolve null", () => {
    expect(resolveActiveOrganization([ORG_A, ORG_B], null)).toBeNull();
  });
});

describe("remember/forget/read", () => {
  it("rememberActiveOrganizationId grava, readStoredActiveOrganizationId le de volta", () => {
    rememberActiveOrganizationId(ORG_A.id);
    expect(readStoredActiveOrganizationId()).toBe(ORG_A.id);
    expect(window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY)).toBe(ORG_A.id);
  });

  it("forgetActiveOrganizationId limpa o valor salvo", () => {
    rememberActiveOrganizationId(ORG_A.id);
    forgetActiveOrganizationId();
    expect(readStoredActiveOrganizationId()).toBeNull();
  });
});

describe("accountBackTarget", () => {
  it("com empresa ativa resolvida, aponta para a Home dela com o nome no rótulo", () => {
    expect(accountBackTarget(ORG_A)).toEqual({
      href: `/organizations/${ORG_A.id}`,
      label: `Voltar para ${ORG_A.name}`,
    });
  });

  it("sem empresa ativa (null), cai para 'Suas empresas'", () => {
    expect(accountBackTarget(null)).toEqual({ href: "/organizations", label: "Suas empresas" });
  });
});
