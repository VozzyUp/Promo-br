/**
 * Redireciona para um caminho do próprio site com Location relativo ("/entrar"), que o navegador completa
 * com o endereço que o visitante usou. Montar a URL com request.url quebra no Docker: lá o servidor escuta
 * em 0.0.0.0 e o visitante seria mandado para http://0.0.0.0:3000.
 */
export function redirectToPath(path: string, status: 302 | 303 | 307 = 307, headers: Record<string, string> = {}): Response {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error(`Caminho de redirecionamento inválido: ${path}`);
  return new Response(null, { status, headers: { Location: path, ...headers } });
}
