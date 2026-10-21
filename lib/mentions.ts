// Menções "@usuario" em comentários e descrições.
const MENTION = /(?<![\w@])@([a-zA-Z0-9_]{3,24})\b/g;

/** Nomes de usuário mencionados (minúsculos, sem repetir, no máximo 10). */
export function extractMentions(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(MENTION)) {
    found.add(m[1].toLowerCase());
    if (found.size >= 10) break;
  }
  return [...found];
}
