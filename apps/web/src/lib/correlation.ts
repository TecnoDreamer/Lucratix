/** Interpretação textual de um coeficiente de correlação de Pearson — puro,
 * sem acesso a rede (mesmo padrão de `insights.ts`). Faixas de força
 * seguem uma convenção comum (não um padrão universal): |r| ≥ 0,7 forte;
 * 0,4–0,7 moderada; 0,2–0,4 fraca; abaixo disso, muito fraca/desprezível.
 */

export type CorrelationStrength = "forte" | "moderada" | "fraca" | "muito fraca";

export interface CorrelationDescription {
  strength: CorrelationStrength;
  direction: "positiva" | "negativa" | null;
  label: string;
}

export function describeCorrelation(r: number): CorrelationDescription {
  const abs = Math.abs(r);
  const direction = r > 0 ? "positiva" : r < 0 ? "negativa" : null;

  let strength: CorrelationStrength;
  if (abs >= 0.7) strength = "forte";
  else if (abs >= 0.4) strength = "moderada";
  else if (abs >= 0.2) strength = "fraca";
  else strength = "muito fraca";

  const label = direction ? `Correlação ${strength} ${direction}` : "Sem correlação";
  return { strength, direction, label };
}
