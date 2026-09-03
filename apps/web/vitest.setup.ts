import "@testing-library/jest-dom/vitest";
import type { ReactNode } from "react";
import { vi } from "vitest";
import ptBRMessages from "./messages/pt-BR.json";

// jsdom nao implementa scrollIntoView — usado pelo glossario para navegar
// ate um item (indice alfabetico, deep-link de metrica).
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// jsdom tambem nao implementa ResizeObserver — usado pelo `ResponsiveContainer`
// do Recharts (funil/gráficos, 2026-09-02) para medir o container antes de
// desenhar. Sem isso, montar qualquer gráfico Recharts em teste lança
// `ReferenceError`. Stub minimo (observe/unobserve/disconnect no-op) — os
// testes de gráfico verificam a tabela `sr-only`/visível com os dados, não o
// layout medido de verdade (isso é responsabilidade do navegador real).
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// i18n (2026-09-01): mock global de `next-intl` usando o motor real de
// ICU MessageFormat (`createTranslator`, recomendado pela própria
// documentação do next-intl para testar sem `<NextIntlClientProvider>`),
// alimentado pelo catálogo pt-BR de verdade — não um mock hand-rolled.
// Como cada valor de messages/pt-BR.json é extraído idêntico, caractere
// por caractere, ao texto que substituiu, todo `screen.getByText("...")`
// escrito antes da extração continua batendo sem nenhuma alteração.
vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  return {
    ...actual,
    // `namespace` aceita qualquer string (as extraction passes preenchem
    // mais chaves em messages/pt-BR.json do que o TypeScript vê estaticamente
    // aqui) — a checagem de tipo de verdade acontece no app real via
    // `useTranslations` genuíno, não neste mock de teste.
    useTranslations: (namespace?: string) =>
      actual.createTranslator({
        locale: "pt-BR",
        messages: ptBRMessages,
        namespace: namespace as never,
      }),
    useLocale: () => "pt-BR",
    useFormatter: () => actual.createFormatter({ locale: "pt-BR" }),
    NextIntlClientProvider: ({ children }: { children: ReactNode }) => children,
  };
});
