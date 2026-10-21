import { describe, expect, it } from "vitest";
import { checkImage, inspectImage } from "../lib/image-check";

function pngBytes(w: number, h: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  b.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
}

function jpegBytes(w: number, h: number) {
  // SOI, APP0 curto, SOF0 com altura e largura
  const b = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0, 0, 0]);
  return b;
}

function webpXBytes(w: number, h: number) {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58]);
  const wm = w - 1;
  const hm = h - 1;
  b.set([wm & 255, (wm >> 8) & 255, (wm >> 16) & 255, hm & 255, (hm >> 8) & 255, (hm >> 16) & 255], 24);
  return b;
}

describe("inspectImage", () => {
  it("lê PNG, JPEG e WebP", () => {
    expect(inspectImage(pngBytes(800, 600))).toEqual({ type: "png", width: 800, height: 600 });
    expect(inspectImage(jpegBytes(640, 480))).toEqual({ type: "jpeg", width: 640, height: 480 });
    expect(inspectImage(webpXBytes(1024, 768))).toEqual({ type: "webp", width: 1024, height: 768 });
  });

  it("recusa o que não é imagem, mesmo com nome de imagem", () => {
    expect(inspectImage(new TextEncoder().encode("<svg onload=alert(1)></svg>"))).toBeNull();
    expect(inspectImage(new TextEncoder().encode("#!/bin/sh\nrm -rf /"))).toBeNull();
    expect(inspectImage(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("checkImage", () => {
  it("aceita uma imagem dentro das regras", () => {
    expect(checkImage(pngBytes(800, 600))).toBeNull();
  });

  it("recusa pequena demais, grande demais e formato inválido", () => {
    expect(checkImage(pngBytes(100, 100))).toMatch(/pelo menos 150/);
    expect(checkImage(pngBytes(7000, 800))).toMatch(/6000/);
    expect(checkImage(new Uint8Array(0))).toMatch(/vazio/);
    expect(checkImage(new TextEncoder().encode("oi tudo bem"))).toMatch(/JPG, PNG ou WebP/);
  });

  it("recusa arquivo acima do limite de tamanho", () => {
    expect(checkImage(pngBytes(800, 600), { maxBytes: 20, minSide: 150, maxSide: 6000 })).toMatch(/passa de/);
  });
});
