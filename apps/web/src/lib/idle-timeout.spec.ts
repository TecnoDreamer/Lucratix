import { describe, expect, it } from "vitest";
import { isPrivatePath } from "./idle-timeout";

describe("isPrivatePath", () => {
  it.each(["/organizations", "/organizations/org-1", "/organizations/org-1/funnel", "/conta", "/conta/configuracoes", "/admin", "/admin/users"])(
    "%s é privado",
    (path) => {
      expect(isPrivatePath(path)).toBe(true);
    }
  );

  it.each(["/", "/login", "/register", "/esqueci-senha", "/redefinir-senha", "/confirmar-email", "/sobre"])(
    "%s é público",
    (path) => {
      expect(isPrivatePath(path)).toBe(false);
    }
  );

  it("não trata um prefixo parecido como privado (ex.: /organizations-publico)", () => {
    expect(isPrivatePath("/organizations-publico")).toBe(false);
  });
});
