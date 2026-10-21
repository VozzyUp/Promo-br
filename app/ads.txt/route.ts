// ads.txt do AdSense: lista quem pode vender o nosso espaço. Vazio enquanto o ID não estiver configurado.
import { getAdsSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = (await getAdsSettings()).client;
  const pub = client.replace(/^ca-/, "");
  const body = /^pub-\d+$/.test(pub) ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "";
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
