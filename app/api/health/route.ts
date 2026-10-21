// Verificação de saúde para o Swarm/Traefik: não toca no banco, só confirma que o processo responde.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true });
}
