#!/usr/bin/env node
// Compara o conjunto de chaves dos 3 catálogos de mensagem e falha se
// algum idioma estiver faltando uma chave que outro tem. next-intl não
// valida isso em build — uma chave faltando em en.json/es.json renderiza
// a chave crua em produção, silenciosamente.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES = ["pt-BR", "en", "es"];

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const keySets = new Map();
for (const locale of LOCALES) {
  const filePath = join(__dirname, "..", "messages", `${locale}.json`);
  const content = JSON.parse(readFileSync(filePath, "utf-8"));
  keySets.set(locale, new Set(flattenKeys(content)));
}

const allKeys = new Set(LOCALES.flatMap((locale) => [...keySets.get(locale)]));

let hasMissing = false;
for (const key of allKeys) {
  const missingIn = LOCALES.filter((locale) => !keySets.get(locale).has(key));
  if (missingIn.length > 0) {
    hasMissing = true;
    console.error(`Chave "${key}" ausente em: ${missingIn.join(", ")}`);
  }
}

if (hasMissing) {
  console.error("\nCatálogos de i18n divergentes — ver mensagens acima.");
  process.exit(1);
}

console.log(`OK — ${allKeys.size} chaves, consistentes entre ${LOCALES.join(", ")}.`);
