// Pontos, nível, estatísticas e medalhas de um usuário (Supabase).
import "server-only";
import { badgeName, computeBadges, currentStreak, earnedBadgeKeys, levelFor, weekKey, type Stats } from "../badges";
import { db } from "../supabase/db";

const POINT_KINDS = ["hot_100", "helpful_comment", "weekly_votes", "streak_bonus"];

export async function getUserStats(userId: string): Promise<Stats> {
  const { data, error } = await db().rpc("user_stats", { p_user: userId });
  if (error) throw error;
  return (data ?? {}) as Stats;
}

/** Início da semana corrente (segunda 00:00 em São Paulo), em ISO UTC. */
export function weekStartIso(now: Date): string {
  const local = new Date(now.getTime() - 3 * 3600_000);
  const day = (local.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day) + 3 * 3600_000).toISOString();
}

export async function getPoints(userId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - 365 * 86400_000).toISOString();
  const [events, week] = await Promise.all([
    db().from("reputation_events").select("kind, points, ref").eq("user_id", userId).in("kind", POINT_KINDS).gte("created_at", since),
    db().from("votes").select("deal_id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", weekStartIso(now)),
  ]);
  if (events.error) throw events.error;
  if (week.error) throw week.error;
  const rows = events.data as { kind: string; points: number; ref: string | null }[];
  const sum = (kind: string) => rows.filter((r) => r.kind === kind).reduce((s, r) => s + r.points, 0);
  const weeks = rows.filter((r) => r.kind === "weekly_votes" && r.ref).map((r) => r.ref as string);
  const total = rows.reduce((s, r) => s + r.points, 0);
  return {
    total,
    hot: sum("hot_100"),
    helpful: sum("helpful_comment"),
    weekly: sum("weekly_votes"),
    streakBonus: sum("streak_bonus"),
    streakWeeks: currentStreak(weeks, now),
    weekDone: weeks.includes(weekKey(now)),
    votesThisWeek: week.count ?? 0,
    level: levelFor(total),
  };
}

/** Estatísticas + o que só o perfil sabe (foto e descrição completas). */
export async function getStatsWithProfile(userId: string): Promise<Stats> {
  const [stats, profile] = await Promise.all([
    getUserStats(userId),
    db().from("profiles").select("avatar_url, bio").eq("id", userId).maybeSingle(),
  ]);
  const p = profile.data as { avatar_url: string | null; bio: string | null } | null;
  return { ...stats, profile_complete: p?.avatar_url && p?.bio ? 1 : 0 };
}

export async function listUserBadgeKeys(userId: string): Promise<string[]> {
  const { data, error } = await db().from("user_badges").select("badge_key").eq("user_id", userId);
  if (error) throw error;
  return (data as { badge_key: string }[]).map((r) => r.badge_key);
}

/** Grava as medalhas novas e avisa a pessoa. Seguro para chamar a qualquer momento. */
export async function syncBadges(userId: string): Promise<string[]> {
  const [stats, have] = await Promise.all([getStatsWithProfile(userId), listUserBadgeKeys(userId)]);
  const known = new Set(have);
  const fresh = earnedBadgeKeys(stats).filter((k) => !known.has(k));
  if (fresh.length === 0) return [];
  const { error } = await db().from("user_badges").upsert(fresh.map((badge_key) => ({ user_id: userId, badge_key })), { onConflict: "user_id,badge_key", ignoreDuplicates: true });
  if (error) throw error;
  for (const key of fresh) {
    await db().rpc("push_notification", {
      p_user: userId, p_kind: "badge", p_actor: null, p_deal: null, p_comment: null, p_data: { name: badgeName(key) ?? key },
    });
  }
  return fresh;
}

export async function getBadgeChains(userId: string) {
  return computeBadges(await getStatsWithProfile(userId));
}
