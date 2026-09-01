import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { LocaleSync } from "./locale-sync";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

afterEach(() => {
  cleanup();
  document.cookie = "NEXT_LOCALE=; Max-Age=0; Path=/";
  mockRefresh.mockReset();
  vi.mocked(api.get).mockReset();
});

describe("LocaleSync", () => {
  it("usuário anônimo (401) não faz nada", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.mocked(api.get).mockRejectedValue(new ApiError(401, "Nao autenticado"));

    render(<LocaleSync />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/api/v1/auth/me");
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("locale salvo igual ao cookie atual não atualiza nada", async () => {
    document.cookie = "NEXT_LOCALE=pt-BR; Path=/";
    vi.mocked(api.get).mockResolvedValue({ locale: "pt-BR" });

    render(<LocaleSync />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("locale salvo diferente do cookie atualiza o cookie e chama router.refresh", async () => {
    document.cookie = "NEXT_LOCALE=pt-BR; Path=/";
    vi.mocked(api.get).mockResolvedValue({ locale: "en" });

    render(<LocaleSync />);

    await waitFor(() => {
      expect(document.cookie).toContain("NEXT_LOCALE=en");
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("sem cookie nenhum e locale salvo, adota o salvo", async () => {
    vi.mocked(api.get).mockResolvedValue({ locale: "es" });

    render(<LocaleSync />);

    await waitFor(() => {
      expect(document.cookie).toContain("NEXT_LOCALE=es");
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("locale salvo nulo (nunca escolheu) não mexe no cookie", async () => {
    vi.mocked(api.get).mockResolvedValue({ locale: null });

    render(<LocaleSync />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });
    expect(document.cookie).not.toContain("NEXT_LOCALE=");
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
