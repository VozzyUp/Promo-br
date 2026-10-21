// Confere uma imagem enviada pelo usuário olhando os bytes (não o nome nem o tipo informado pelo navegador).
// Lê só o cabeçalho para achar o formato e as dimensões; nada é decodificado nem executado.

export type ImageInfo = { type: "jpeg" | "png" | "webp"; width: number; height: number };

export const IMAGE_RULES = { maxBytes: 3 * 1024 * 1024, minSide: 150, maxSide: 6000 } as const;

const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u24le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const ascii = (b: Uint8Array, o: number, n: number) => String.fromCharCode(...b.slice(o, o + n));

function png(b: Uint8Array): ImageInfo | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || !sig.every((v, i) => b[i] === v) || ascii(b, 12, 4) !== "IHDR") return null;
  return { type: "png", width: u32be(b, 16), height: u32be(b, 20) };
}

function jpeg(b: Uint8Array): ImageInfo | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    // SOF0..SOF15, menos DHT (C4), JPG (C8) e DAC (CC): trazem altura e largura
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { type: "jpeg", height: u16be(b, i + 5), width: u16be(b, i + 7) };
    }
    if (marker === 0xd9 || marker === 0xda) return null; // fim da imagem ou início dos dados sem achar o SOF
    i += 2 + u16be(b, i + 2);
  }
  return null;
}

function webp(b: Uint8Array): ImageInfo | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 4) !== "WEBP") return null;
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X") return { type: "webp", width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) };
  if (chunk === "VP8 ") return { type: "webp", width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  if (chunk === "VP8L" && b[20] === 0x2f) {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { type: "webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function inspectImage(bytes: Uint8Array): ImageInfo | null {
  return png(bytes) ?? jpeg(bytes) ?? webp(bytes);
}

/** Devolve a mensagem de erro para mostrar ao usuário, ou null se a imagem serve. */
export function checkImage(bytes: Uint8Array, rules: { maxBytes: number; minSide: number; maxSide: number } = IMAGE_RULES): string | null {
  if (bytes.length === 0) return "O arquivo está vazio.";
  if (bytes.length > rules.maxBytes) return `A imagem passa de ${Math.round(rules.maxBytes / 1024 / 1024)} MB.`;
  const info = inspectImage(bytes);
  if (!info) return "Use uma imagem JPG, PNG ou WebP.";
  if (info.width < rules.minSide || info.height < rules.minSide) return `A imagem precisa ter pelo menos ${rules.minSide}x${rules.minSide} pixels.`;
  if (info.width > rules.maxSide || info.height > rules.maxSide) return `A imagem passa de ${rules.maxSide} pixels de lado.`;
  return null;
}

export const EXTENSION: Record<ImageInfo["type"], string> = { jpeg: "jpg", png: "png", webp: "webp" };
export const MIME: Record<ImageInfo["type"], string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
