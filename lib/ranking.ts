// Pesos do ranking "mais quentes". O cálculo roda no banco (view deals_ranked, migração 7); aqui ficam os padrões e a validação.
export type RankWeights = { discount: number; clicks: number; votes: number; verified: number; boost: number; decay: number };

export const DEFAULT_WEIGHTS: RankWeights = { discount: 0.5, clicks: 4, votes: 1.5, verified: 8, boost: 30, decay: 1.5 };

export const WEIGHT_FIELDS: { key: keyof RankWeights; label: string; help: string; min: number; max: number; step: number }[] = [
  { key: "votes", label: "Votos (quente menos frio)", help: "Quanto cada voto líquido da comunidade conta.", min: 0, max: 10, step: 0.1 },
  { key: "clicks", label: "Cliques", help: "Peso dos cliques nas últimas 24 horas e do total.", min: 0, max: 20, step: 0.1 },
  { key: "discount", label: "Desconto real", help: "Peso do desconto conferido pelo histórico de preços.", min: 0, max: 5, step: 0.05 },
  { key: "verified", label: "Selo “desconto verificado”", help: "Pontos extras para quem tem o selo.", min: 0, max: 50, step: 1 },
  { key: "boost", label: "Oferta impulsionada", help: "Pontos extras enquanto o impulso está ativo.", min: 0, max: 200, step: 1 },
  { key: "decay", label: "Velocidade com que esfria", help: "Maior = a oferta perde posição mais rápido com o passar das horas.", min: 0.5, max: 3, step: 0.1 },
];

/** Lê os campos de um formulário; devolve o erro em português se algum valor estiver fora do limite. */
export function parseWeights(read: (key: string) => string): { weights: RankWeights } | { error: string } {
  const out = { ...DEFAULT_WEIGHTS };
  for (const f of WEIGHT_FIELDS) {
    const raw = read(f.key).trim().replace(",", ".");
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) return { error: `“${f.label}” precisa ser um número.` };
    if (n < f.min || n > f.max) return { error: `“${f.label}” fica entre ${f.min} e ${f.max}.` };
    out[f.key] = n;
  }
  return { weights: out };
}

/** Junta o que está salvo com os padrões, ignorando o que não for número. */
export function mergeWeights(stored: Partial<Record<keyof RankWeights, unknown>> | null | undefined): RankWeights {
  const out = { ...DEFAULT_WEIGHTS };
  for (const f of WEIGHT_FIELDS) {
    const v = stored?.[f.key];
    if (typeof v === "number" && Number.isFinite(v)) out[f.key] = v;
  }
  return out;
}
