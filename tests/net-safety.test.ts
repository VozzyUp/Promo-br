import { describe, expect, it } from "vitest";
import { isPublicIp } from "../lib/net-safety";

describe("isPublicIp", () => {
  it("aceita endereços públicos", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "177.10.20.30", "2606:4700:4700::1111", "2800:3f0:4001:80c::200e"]) {
      expect(isPublicIp(ip), ip).toBe(true);
    }
  });

  it("recusa loopback, redes privadas e metadados de nuvem", () => {
    for (const ip of ["127.0.0.1", "127.8.8.8", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it("recusa multicast, reservados e faixas de documentação", () => {
    for (const ip of ["224.0.0.1", "239.255.255.250", "240.0.0.1", "255.255.255.255", "192.0.2.10", "198.51.100.1", "203.0.113.7", "198.18.0.1"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it("não confunde fronteiras das faixas privadas", () => {
    expect(isPublicIp("172.15.255.255")).toBe(true);
    expect(isPublicIp("172.32.0.1")).toBe(true);
    expect(isPublicIp("100.63.255.255")).toBe(true);
    expect(isPublicIp("100.128.0.1")).toBe(true);
  });

  it("IPv6: recusa loopback, privados, link-local e documentação", () => {
    for (const ip of ["::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "2001:db8::1"]) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it("IPv6 com IPv4 embutido vale a regra do IPv4", () => {
    expect(isPublicIp("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicIp("::ffff:10.1.2.3")).toBe(false);
    expect(isPublicIp("::ffff:8.8.8.8")).toBe(true);
    expect(isPublicIp("64:ff9b::7f00:1")).toBe(false);
  });

  it("o que não é IP nunca passa", () => {
    for (const bad of ["", "localhost", "example.com", "999.1.1.1", "1.2.3", "0x7f.0.0.1", "2130706433", "::g"]) {
      expect(isPublicIp(bad), bad).toBe(false);
    }
  });
});
