// Opções dos menus do cabeçalho que não vêm do banco: os tipos de "Grátis" e o ícone de cada categoria.

/** Tipos de grátis: cada um é uma busca dentro das ofertas de preço zero. */
export const FREE_KINDS = [
  { slug: "jogos", label: "Jogos grátis", query: "jogo or game or steam or epic", icon: "gamepad" },
  { slug: "cursos", label: "Cursos grátis", query: "curso or aula or certificado", icon: "graduation" },
  { slug: "livros", label: "Livros e e-books grátis", query: "livro or ebook or kindle", icon: "book" },
  { slug: "assinaturas", label: "Testes grátis de assinaturas", query: "assinatura or trial or streaming or teste", icon: "repeat" },
  { slug: "amostras", label: "Amostras e brindes", query: "amostra or brinde", icon: "gift" },
] as const;

export type FreeKind = (typeof FREE_KINDS)[number];

export const freeKind = (slug: unknown): FreeKind | undefined => FREE_KINDS.find((k) => k.slug === slug);

/** Ícone da categoria pelo nome do endereço; categoria nova cai num ícone genérico. */
export function categoryIcon(slug: string): string {
  const s = slug.toLowerCase();
  const rules: [RegExp, string][] = [
    [/eletron|tecno|celular|informat/, "smartphone"],
    [/game|jogo|videogame/, "gamepad"],
    [/casa|cozinha|lar|movel/, "house"],
    [/moda|roupa|calcad/, "shirt"],
    [/mercado|aliment|bebida/, "basket"],
    [/beleza|saude|farmac/, "heart"],
    [/viag|turismo|hotel/, "plane"],
    [/esporte|fitness/, "dumbbell"],
    [/bebe|crianc|infantil|brinquedo/, "baby"],
    [/auto|carro|moto/, "car"],
    [/pet/, "paw"],
    [/livro|curso/, "book"],
  ];
  return rules.find(([re]) => re.test(s))?.[1] ?? "tag";
}
