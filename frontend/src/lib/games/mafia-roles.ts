/** Mafia role color families for UI (approximate hues, not brand-exact). */

export type MafiaRoleId =
  | "citizen"
  | "mafia"
  | "spy"
  | "doctor"
  | "police"
  | "vigilante";

export type MafiaActionId = "kill" | "heal" | "investigate" | "vigilante_strike";

export const MAFIA_ROLE_LABELS: Record<MafiaRoleId, string> = {
  citizen: "시민",
  mafia: "마피아",
  spy: "스파이",
  doctor: "의사",
  police: "경찰",
  vigilante: "자경단",
};

export const MAFIA_ROLE_IMAGE: Record<MafiaRoleId, string> = {
  citizen: "/games/mafia/mafia-role-citizen.png",
  mafia: "/games/mafia/mafia-role-mafia.png",
  spy: "/games/mafia/mafia-role-spy.png",
  doctor: "/games/mafia/mafia-role-doctor.png",
  police: "/games/mafia/mafia-role-police.png",
  vigilante: "/games/mafia/mafia-role-vigilante.png",
};

export const MAFIA_ACTION_IMAGE: Record<MafiaActionId, string> = {
  kill: "/games/mafia/mafia-action-kill.png",
  heal: "/games/mafia/mafia-action-heal.png",
  investigate: "/games/mafia/mafia-action-investigate.png",
  vigilante_strike: "/games/mafia/mafia-action-vigilante.png",
};

/** Text + soft background / border for chips and reveal cards. */
export function mafiaRoleTone(role?: string | null): {
  text: string;
  soft: string;
  border: string;
  dot: string;
} {
  switch (role) {
    case "mafia":
      return {
        text: "text-red-600 dark:text-red-400",
        soft: "bg-red-500/10",
        border: "border-red-500/25",
        dot: "bg-red-500",
      };
    case "spy":
      return {
        text: "text-purple-600 dark:text-purple-400",
        soft: "bg-purple-500/10",
        border: "border-purple-500/25",
        dot: "bg-purple-500",
      };
    case "doctor":
      return {
        text: "text-emerald-600 dark:text-emerald-400",
        soft: "bg-emerald-500/10",
        border: "border-emerald-500/25",
        dot: "bg-emerald-500",
      };
    case "police":
      return {
        text: "text-zinc-800 dark:text-zinc-100",
        soft: "bg-zinc-900/10 dark:bg-zinc-100/10",
        border: "border-zinc-800/20 dark:border-zinc-100/20",
        dot: "bg-zinc-900 dark:bg-zinc-100",
      };
    case "vigilante":
      return {
        text: "text-indigo-600 dark:text-indigo-400",
        soft: "bg-indigo-500/10",
        border: "border-indigo-500/25",
        dot: "bg-indigo-500",
      };
    case "citizen":
    default:
      return {
        text: "text-foreground",
        soft: "bg-surface/60",
        border: "border-border",
        dot: "bg-muted-foreground",
      };
  }
}

export function mafiaRoleFromLabel(label?: string | null): MafiaRoleId | null {
  if (!label) return null;
  const entry = (Object.entries(MAFIA_ROLE_LABELS) as [MafiaRoleId, string][]).find(
    ([, ko]) => ko === label
  );
  return entry?.[0] ?? null;
}

export function mafiaRoleFromNightKey(key: string): MafiaRoleId | null {
  if (key === "mafia_kill") return "mafia";
  if (key.startsWith("doctor:")) return "doctor";
  if (key.startsWith("police:")) return "police";
  if (key.startsWith("spy:")) return "spy";
  if (key.startsWith("vigilante:")) return "vigilante";
  return null;
}

export function mafiaActionFromNightKey(key: string): MafiaActionId | null {
  if (key === "mafia_kill") return "kill";
  if (key.startsWith("doctor:")) return "heal";
  if (key.startsWith("police:") || key.startsWith("spy:")) return "investigate";
  if (key.startsWith("vigilante:")) return "vigilante_strike";
  return null;
}
