import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import AccountSettingsPage from "./page";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("AccountSettingsPage", () => {
  it("mostra as tres opcoes de tema", async () => {
    render(<AccountSettingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
    });
    expect(screen.getByRole("radio", { name: "Sistema" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Escuro" })).toBeInTheDocument();
  });

  it("comeca com 'Sistema' marcado quando nao ha preferencia salva", async () => {
    render(<AccountSettingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Sistema" })).toHaveAttribute("aria-checked", "true");
    });
  });

  it("reflete a preferencia ja salva ao carregar", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    render(<AccountSettingsPage />);
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "Escuro" })).toHaveAttribute("aria-checked", "true");
    });
  });

  it("clicar em 'Escuro' marca a opcao, persiste e aplica a classe dark", async () => {
    render(<AccountSettingsPage />);
    await waitFor(() => screen.getByRole("radiogroup"));

    fireEvent.click(screen.getByRole("radio", { name: "Escuro" }));

    expect(screen.getByRole("radio", { name: "Escuro" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Sistema" })).toHaveAttribute("aria-checked", "false");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("clicar em 'Claro' remove a classe dark", async () => {
    document.documentElement.classList.add("dark");
    render(<AccountSettingsPage />);
    await waitFor(() => screen.getByRole("radiogroup"));

    fireEvent.click(screen.getByRole("radio", { name: "Claro" }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
