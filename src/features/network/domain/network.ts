/* Conseil des Ombres — constantes et calculs réseau (client et serveur) */

import { diffDays, parseKey, todayKey } from "@/shared/lib/dates";

export { LINK_KINDS, LINK_GROUPS, linkKind } from "./kinship";

export type Channel = { kind: string; value: string };

export type Person = {
  id: number;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  gender: string | null;
  isSelf: boolean;
  intimacy: number;
  metAt: string | null;
  lastSeen: string | null;
  lastContact: string | null;
  lastContactKind: string | null;
  contactEveryDays: number | null;
  channels: string | null;
  birthday: string | null;
  deceased: boolean;
  diedOn: string | null;
  coldSince: string | null;
  coldReason: string | null;
  notes: string | null;
};

export type PersonLink = { id: number; aId: number; bId: number; kind: string; label: string | null };
export type Interaction = { id: number; personId: number; date: string; kind: string; note: string | null };

/** Niveau ≥ à ce seuil = « cercle intime » : un contact coche la tâche du jour */
export const INNER_CIRCLE_MIN = 4;

export const INTIMACY: Record<number, { label: string; color: string; every: number | null }> = {
  5: { label: "Cercle intime", color: "#d4af37", every: 7 },
  4: { label: "Proche", color: "#a78bfa", every: 14 },
  3: { label: "Ami", color: "#38bdf8", every: 30 },
  2: { label: "Connaissance", color: "#10b981", every: 90 },
  1: { label: "Contact", color: "#a0a0a0", every: null },
};

export const INTERACTION_KINDS: Record<string, { label: string; icon: string; inPerson?: boolean }> = {
  vu: { label: "Vu en vrai", icon: "users", inPerson: true },
  appel: { label: "Appel", icon: "phone" },
  visio: { label: "Visio", icon: "video" },
  message: { label: "Message", icon: "message-circle" },
  autre: { label: "Autre", icon: "sparkles" },
};

/** Moyens de contact — couleur de marque + lien cliquable quand c'est possible */
export const CHANNELS: Record<
  string,
  { label: string; short: string; color: string; icon: string; placeholder: string; href?: (v: string) => string }
> = {
  phone: { label: "Téléphone", short: "Tél", color: "#e5e5e5", icon: "phone", placeholder: "+33 6 12 34 56 78", href: (v) => `tel:${v.replace(/[^\d+]/g, "")}` },
  whatsapp: { label: "WhatsApp", short: "WA", color: "#25D366", icon: "message-circle", placeholder: "+33 6 12 34 56 78", href: (v) => `https://wa.me/${v.replace(/[^\d]/g, "")}` },
  telegram: { label: "Telegram", short: "TG", color: "#2AABEE", icon: "send", placeholder: "@pseudo", href: (v) => `https://t.me/${v.replace(/^@/, "")}` },
  signal: { label: "Signal", short: "Signal", color: "#3A76F0", icon: "message-square", placeholder: "+33 6 12 34 56 78" },
  instagram: { label: "Instagram", short: "Insta", color: "#E1306C", icon: "camera", placeholder: "@pseudo", href: (v) => `https://instagram.com/${v.replace(/^@/, "")}` },
  messenger: { label: "Messenger", short: "Msgr", color: "#0084FF", icon: "message-circle", placeholder: "pseudo", href: (v) => `https://m.me/${v.replace(/^@/, "")}` },
  snapchat: { label: "Snapchat", short: "Snap", color: "#FFFC00", icon: "ghost", placeholder: "pseudo", href: (v) => `https://snapchat.com/add/${v.replace(/^@/, "")}` },
  mail: { label: "E-mail", short: "Mail", color: "#a3a3a3", icon: "mail", placeholder: "nom@exemple.fr", href: (v) => `mailto:${v}` },
  discord: { label: "Discord", short: "Discord", color: "#5865F2", icon: "gamepad-2", placeholder: "pseudo" },
  facebook: { label: "Facebook", short: "FB", color: "#1877F2", icon: "user", placeholder: "profil", href: (v) => `https://facebook.com/${v.replace(/^@/, "")}` },
  linkedin: { label: "LinkedIn", short: "in", color: "#0A66C2", icon: "briefcase", placeholder: "profil", href: (v) => `https://linkedin.com/in/${v.replace(/^@/, "")}` },
  x: { label: "X / Twitter", short: "X", color: "#d4d4d4", icon: "at-sign", placeholder: "@pseudo", href: (v) => `https://x.com/${v.replace(/^@/, "")}` },
  tiktok: { label: "TikTok", short: "TikTok", color: "#ff0050", icon: "music", placeholder: "@pseudo", href: (v) => `https://tiktok.com/@${v.replace(/^@/, "")}` },
  autre: { label: "Autre", short: "Autre", color: "#a0a0a0", icon: "link", placeholder: "lien ou identifiant" },
};

export function channelHref(c: Channel): string | undefined {
  const v = c.value.trim();
  if (!v) return undefined;
  if (/^https?:\/\//i.test(v)) return v;
  return CHANNELS[c.kind]?.href?.(v);
}

export function parseChannels(raw: string | null): Channel[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((c) => c && typeof c.kind === "string" && typeof c.value === "string") : [];
  } catch {
    return [];
  }
}

export function displayName(p: Pick<Person, "firstName" | "lastName" | "nickname">): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

export function shortName(p: Pick<Person, "firstName" | "nickname">): string {
  return p.nickname || p.firstName;
}

export function initials(p: Pick<Person, "firstName" | "lastName">): string {
  return ((p.firstName?.[0] ?? "") + (p.lastName?.[0] ?? "")).toUpperCase() || "?";
}

export function intimacyMeta(level: number) {
  return INTIMACY[level] ?? INTIMACY[3];
}

/** Date du contact le plus récent (vu en vrai ou à distance) */
export function lastTouch(p: Person): string | null {
  const d = [p.lastSeen, p.lastContact].filter(Boolean) as string[];
  return d.length ? d.sort().at(-1)! : null;
}

export function daysSince(date: string | null, today = todayKey()): number | null {
  return date ? diffDays(today, date) : null;
}

export type Freshness = { status: "ok" | "soon" | "late" | "cold" | "none"; color: string; ratio: number; every: number | null; since: number | null };

/** État de la relation par rapport au rythme de contact souhaité */
export function freshness(p: Person, today = todayKey()): Freshness {
  const every = p.contactEveryDays ?? intimacyMeta(p.intimacy).every;
  const since = daysSince(lastTouch(p), today);
  if (p.isSelf || p.deceased) return { status: "none", color: "#a0a0a0", ratio: 0, every: null, since };
  // en froid : pas de rappel, la relation est en pause
  if (p.coldSince) return { status: "cold", color: COLD_COLOR, ratio: 0, every, since };
  if (!every) return { status: "none", color: "#a0a0a0", ratio: 0, every, since };
  if (since === null) return { status: "late", color: "#f87171", ratio: 99, every, since };
  const ratio = since / every;
  if (ratio >= 1) return { status: "late", color: "#f87171", ratio, every, since };
  if (ratio >= 0.75) return { status: "soon", color: "#d4af37", ratio, every, since };
  return { status: "ok", color: "#10b981", ratio, every, since };
}

export const COLD_COLOR = "#7dd3fc";

/** Personnes affichées dans le cercle (fiches, toile, rappels) : tout le monde sauf « Moi ». */
export const isCircleMember = (p: Pick<Person, "isSelf">) => !p.isSelf;

/** "1987" ou "1987 – 2021" */
export function lifeYears(p: Pick<Person, "birthday" | "deceased" | "diedOn">): string | null {
  const born = p.birthday?.slice(0, 4);
  const died = p.diedOn?.slice(0, 4);
  if (p.deceased) return `${born ?? "?"} – ${died ?? "?"}`;
  return born ?? null;
}

export function agoFr(days: number | null): string {
  if (days === null) return "jamais";
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  if (days < 365) return `il y a ${Math.round(days / 30)} mois`;
  const y = Math.floor(days / 365);
  return `il y a ${y} an${y > 1 ? "s" : ""}`;
}

/** Jours avant le prochain anniversaire (null si inconnu) */
export function daysToBirthday(birthday: string | null, today = todayKey()): number | null {
  if (!birthday || birthday.length < 10) return null;
  const t = parseKey(today);
  const m = Number(birthday.slice(5, 7)) - 1;
  const d = Number(birthday.slice(8, 10));
  let next = new Date(t.getFullYear(), m, d);
  if (next < t) next = new Date(t.getFullYear() + 1, m, d);
  return Math.round((next.getTime() - t.getTime()) / 86400000);
}
