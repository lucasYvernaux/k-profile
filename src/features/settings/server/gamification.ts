import "server-only";
import { readJsonSetting, writeJsonSetting } from "./settings-store";

/*
 * Optional gamification (XP, levels, streaks, badges). Off by default: K's
 * principles are "no streak that breaks, no guilt" (ADR 0010). The user can
 * turn it on in Réglages.
 */

const KEY = "gamification";

type GamificationSetting = { enabled: boolean };

export async function isGamificationEnabled(): Promise<boolean> {
  const stored = await readJsonSetting<GamificationSetting>(KEY);
  return stored?.enabled === true;
}

export async function setGamificationEnabled(enabled: boolean): Promise<void> {
  await writeJsonSetting(KEY, { enabled });
}
