import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { LAST_ACTIVITY_STORAGE_KEY } from "@/lib/idle-timeout";
import { IdleLogoutWatcher } from "./idle-logout-watcher";

let mockPathname = "/organizations/org-1";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, api: { ...actual.api, post: vi.fn() } };
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mockPathname = "/organizations/org-1";
  mockPush.mockReset();
  vi.mocked(api.post).mockReset();
});

const FOURTEEN_MIN = 14 * 60 * 1000;
const FIFTEEN_MIN = 15 * 60 * 1000;

describe("IdleLogoutWatcher", () => {
  it("em rota pública, nunca mostra aviso nem desloga", async () => {
    mockPathname = "/login";
    vi.mocked(api.post).mockResolvedValue(undefined);
    render(<IdleLogoutWatcher />);

    await vi.advanceTimersByTimeAsync(FIFTEEN_MIN + 60_000);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("mostra aviso 1 minuto antes do timeout, sem deslogar ainda", async () => {
    render(<IdleLogoutWatcher />);

    await vi.advanceTimersByTimeAsync(FOURTEEN_MIN + 5000);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("sem nenhuma atividade, desloga apos 15 minutos e redireciona", async () => {
    vi.mocked(api.post).mockResolvedValue(undefined);
    render(<IdleLogoutWatcher />);

    await vi.advanceTimersByTimeAsync(FIFTEEN_MIN + 5000);

    expect(api.post).toHaveBeenCalledWith("/api/v1/auth/logout");
    expect(mockPush).toHaveBeenCalledWith("/login?reason=idle_timeout");
  });

  it("atividade durante o aviso cancela o deslogamento", async () => {
    vi.mocked(api.post).mockResolvedValue(undefined);
    render(<IdleLogoutWatcher />);

    await vi.advanceTimersByTimeAsync(FOURTEEN_MIN + 5000);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent(window, new Event("mousedown"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(FIFTEEN_MIN);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("clicar em 'Continuar conectado' no aviso também cancela o deslogamento", async () => {
    vi.mocked(api.post).mockResolvedValue(undefined);
    render(<IdleLogoutWatcher />);

    await vi.advanceTimersByTimeAsync(FOURTEEN_MIN + 5000);
    fireEvent.click(screen.getByRole("button", { name: "Continuar conectado" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(FIFTEEN_MIN);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("logout retornando 401 (sessão já não existia) não redireciona", async () => {
    const { ApiError } = await import("@/lib/api");
    vi.mocked(api.post).mockRejectedValue(new ApiError(401, "Nao autenticado"));
    render(<IdleLogoutWatcher />);

    await vi.advanceTimersByTimeAsync(FIFTEEN_MIN + 5000);

    expect(api.post).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
