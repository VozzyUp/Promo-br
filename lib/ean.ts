// Código de barras (GTIN/EAN): validação pelo dígito verificador.

/** Devolve o código só com dígitos se for um GTIN-8, 12, 13 ou 14 válido; senão null. */
export function normalizeGtin(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const digits = String(raw).replace(/[\s.-]/g, "");
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) return null;
  if (/^0+$/.test(digits)) return null;
  const nums = digits.split("").map(Number);
  const check = nums.pop()!;
  // Da direita para a esquerda, os pesos alternam 3, 1, 3, 1... (começando em 3 logo ao lado do dígito verificador).
  const sum = nums.reverse().reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check ? digits : null;
}