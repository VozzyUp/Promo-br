// Quem pode agir sobre quem no painel: ninguém mexe em quem tem papel igual ou maior que o seu.
export type StaffRole = "user" | "moderator" | "admin" | "system";

const RANK: Record<StaffRole, number> = { user: 0, moderator: 1, admin: 2, system: 3 };

/** Moderador age só sobre usuário comum; admin age sobre usuário e moderador; ninguém age sobre admin ou sistema. */
export function canActOn(actor: StaffRole, target: StaffRole): boolean {
  if (target === "system") return false;
  return RANK[actor] > RANK[target];
}