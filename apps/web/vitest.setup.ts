import "@testing-library/jest-dom/vitest";

// jsdom nao implementa scrollIntoView — usado pelo glossario para navegar
// ate um item (indice alfabetico, deep-link de metrica).
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
