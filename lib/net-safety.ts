// Segurança de rede para o que o servidor busca a pedido do usuário (leitura de link, imagem do link).
// Regra: só endereços públicos. Nada de loopback, rede interna, metadados de nuvem, link-local ou reservados.
import { isIPv4, isIPv6 } from "node:net";

function ipv4Parts(ip: string): number[] | null {
  const p = ip.split(".").map(Number);
  return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? p : null;
}

function publicV4(p: number[]): boolean {
  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127) return false; // "esta rede", privada, loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 169 && b === 254) return false; // link-local e metadados de nuvem (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false; // testes de rede
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a >= 224) return false; // multicast e reservados
  return true;
}

/** Expande um IPv6 para 8 grupos de 16 bits. Aceita "::" e IPv4 embutido no final. */
function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf("%");
  if (zone >= 0) s = s.slice(0, zone);
  const tail = s.lastIndexOf(":");
  const embedded = s.slice(tail + 1);
  if (embedded.includes(".")) {
    const v4 = ipv4Parts(embedded);
    if (!v4) return null;
    s = `${s.slice(0, tail + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if ((halves.length === 1 && head.length !== 8) || missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

function publicV6(g: number[]): boolean {
  if (g.every((x) => x === 0)) return false; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
  // IPv4 mapeado (::ffff:a.b.c.d) ou compatível: vale a regra do IPv4 embutido
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) {
    return publicV4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255]);
  }
  if (g[0] === 0x64 && g[1] === 0xff9b) return publicV4([g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255]); // NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return false; // fc00::/7 (privada)
  if ((g[0] & 0xffc0) === 0xfe80) return false; // fe80::/10 (link-local)
  if ((g[0] & 0xff00) === 0xff00) return false; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentação
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return false; // descarte
  return true;
}

/** true só para endereços IP públicos e roteáveis. Qualquer coisa que não seja IP válido devolve false. */
export function isPublicIp(ip: string): boolean {
  if (isIPv4(ip)) {
    const p = ipv4Parts(ip);
    return !!p && publicV4(p);
  }
  if (isIPv6(ip)) {
    const g = expandV6(ip);
    return !!g && publicV6(g);
  }
  return false;
}
