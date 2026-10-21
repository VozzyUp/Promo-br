import { describe, expect, it } from "vitest";
import { BADGE_CHAINS, computeBadges, currentStreak, earnedBadgeKeys, levelFor, weekKey } from "../lib/badges";

describe("computeBadges", () => {
  it("sem atividade: nada conquistado e só o primeiro degrau destravado", () => {
    const chains = computeBadges({});
    for (const c of chains) {
      expect(c.tiers.every((t) => !t.earned)).toBe(true);
      expect(c.tiers[0].locked).toBe(false);
      c.tiers.slice(1).forEach((t) => expect(t.locked).toBe(true));
    }
  });

  it("conquista os degraus pelo valor e destrava o seguinte", () => {
    const votes = computeBadges({ votes_total: 300 }).find((c) => c.id === "votes")!;
    expect(votes.tiers.map((t) => t.earned)).toEqual([true, true, false]);
    expect(votes.tiers[2].locked).toBe(false);
    expect(votes.tiers[2].current).toBe(300);
  });

  it("o progresso nunca passa do alvo", () => {
    const hot = computeBadges({ hot_max: 99999 }).find((c) => c.id === "hot")!;
    expect(hot.tiers.every((t) => t.current <= t.target)).toBe(true);
  });

  it("chaves de medalha são únicas", () => {
    const keys = BADGE_CHAINS.flatMap((c) => c.tiers.map((t) => t.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("earnedBadgeKeys lista só o conquistado", () => {
    expect(earnedBadgeKeys({ comments_total: 30, profile_complete: 1 }).sort()).toEqual(["perfil-completo", "prosa"]);
  });
});

describe("levelFor", () => {
  it("calcula nível atual, próximo e quanto falta", () => {
    expect(levelFor(0)).toMatchObject({ current: null, missing: 10 });
    expect(levelFor(10).current?.id).toBe("prata");
    expect(levelFor(45)).toMatchObject({ missing: 255 });
    expect(levelFor(45).current?.id).toBe("ouro");
    expect(levelFor(300).next).toBeNull();
  });
});

describe("weekKey e currentStreak", () => {
  it("usa semanas ISO no fuso de São Paulo", () => {
    expect(weekKey(new Date("2026-10-19T12:00:00Z"))).toBe("2026-W43"); // segunda-feira
    expect(weekKey(new Date("2026-10-25T23:00:00Z"))).toBe("2026-W43"); // domingo ainda é a mesma semana
    expect(weekKey(new Date("2026-10-26T02:00:00Z"))).toBe("2026-W43"); // 23h de domingo em São Paulo
    expect(weekKey(new Date("2026-10-26T04:00:00Z"))).toBe("2026-W44");
  });

  it("conta semanas seguidas e não quebra com a semana em curso ainda sem votos", () => {
    const now = new Date("2026-10-21T12:00:00Z"); // semana 43
    expect(currentStreak(["2026-W42", "2026-W41"], now)).toBe(2);
    expect(currentStreak(["2026-W43", "2026-W42", "2026-W41"], now)).toBe(3);
    expect(currentStreak(["2026-W41"], now)).toBe(0);
    expect(currentStreak([], now)).toBe(0);
  });
});
