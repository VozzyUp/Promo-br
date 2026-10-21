// Tipos de discussão da comunidade (valores gravados no banco e rótulos mostrados).
export const DISCUSSION_KINDS = [
  { id: "intro", label: "Apresente-se" },
  { id: "stores", label: "Lojas: opiniões e dúvidas" },
  { id: "request", label: "Peça uma oferta" },
  { id: "international", label: "Compras internacionais" },
  { id: "tips", label: "Dicas para economizar" },
  { id: "contests", label: "Sorteios e concursos" },
  { id: "other", label: "Outros assuntos" },
] as const;

export type DiscussionKind = (typeof DISCUSSION_KINDS)[number]["id"];

export function kindLabel(kind: string): string {
  return DISCUSSION_KINDS.find((k) => k.id === kind)?.label ?? "Discussão";
}

export function isDiscussionKind(v: unknown): v is DiscussionKind {
  return DISCUSSION_KINDS.some((k) => k.id === v);
}
