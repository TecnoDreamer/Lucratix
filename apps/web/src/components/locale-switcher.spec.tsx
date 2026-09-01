import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { LocaleSwitcher } from "./locale-switcher";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, patch: vi.fn() } };
});

afterEach(() => {
  cleanup();
  document.cookie = "NEXT_LOCALE=; Max-Age=0; Path=/";
  mockRefresh.mockReset();
  vi.mocked(api.patch).mockReset();
});

describe("LocaleSwitcher", () => {
  it("mostra as 3 opções, com pt-BR selecionado por padrão (mock global fixa o locale em pt-BR)", () => {
    render(<LocaleSwitcher />);
    const group = screen.getByRole("radiogroup", { name: "Idioma" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Português \(Brasil\)/ })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: "English" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Español" })).toHaveAttribute("aria-checked", "false");
  });

  it("ao trocar, grava o cookie, chama o PATCH e atualiza a página via router.refresh", async () => {
    vi.mocked(api.patch).mockResolvedValue({});
    render(<LocaleSwitcher />);

    fireEvent.click(screen.getByRole("radio", { name: "English" }));

    expect(document.cookie).toContain("NEXT_LOCALE=en");
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith("/api/v1/auth/locale", { locale: "en" });
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("clicar na opção já selecionada não dispara nada", () => {
    render(<LocaleSwitcher />);
    fireEvent.click(screen.getByRole("radio", { name: /Português \(Brasil\)/ }));
    expect(api.patch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("falha silenciosa do PATCH ainda troca o idioma na aba atual", async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error("network"));
    render(<LocaleSwitcher />);

    fireEvent.click(screen.getByRole("radio", { name: "Español" }));

    expect(document.cookie).toContain("NEXT_LOCALE=es");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
