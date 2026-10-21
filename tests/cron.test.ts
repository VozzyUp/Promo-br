import { describe, expect, it } from "vitest";
import { cronMatches, isValidCron } from "../lib/jobs/cron";

// 2026-11-27 11:00Z = 08:00 em Brasília (sexta-feira)
const at = (iso: string) => new Date(iso);

describe("cron", () => {
  it("valida", () => {
    expect(isValidCron("0 8,13,19 * * *")).toBe(true);
    expect(isValidCron("*/15 * * * *")).toBe(true);
    expect(isValidCron("61 * * * *")).toBe(false);
    expect(isValidCron("0 8 * *")).toBe(false);
  });

  it("usa o horário de Brasília", () => {
    expect(cronMatches("0 8 * * *", at("2026-11-27T11:00:00Z"))).toBe(true);
    expect(cronMatches("0 8 * * *", at("2026-11-27T08:00:00Z"))).toBe(false);
  });

  it("lista, passo e faixa", () => {
    expect(cronMatches("0 8,13,19 * * *", at("2026-11-27T16:00:00Z"))).toBe(true); // 13h
    expect(cronMatches("*/15 * * * *", at("2026-11-27T11:30:00Z"))).toBe(true);
    expect(cronMatches("*/15 * * * *", at("2026-11-27T11:07:00Z"))).toBe(false);
    expect(cronMatches("0 9-18 * * *", at("2026-11-27T11:00:00Z"))).toBe(false); // 8h fora da faixa
  });

  it("dia da semana (sexta = 5) e domingo como 0 ou 7", () => {
    expect(cronMatches("0 8 * * 5", at("2026-11-27T11:00:00Z"))).toBe(true);
    expect(cronMatches("0 8 * * 1", at("2026-11-27T11:00:00Z"))).toBe(false);
    expect(cronMatches("0 8 * * 7", at("2026-11-29T11:00:00Z"))).toBe(true);
  });
});