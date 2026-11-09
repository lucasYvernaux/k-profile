import "server-only";
import { DEFAULT_CONFIG, type IntakeConfig } from "@/features/intake/domain/intake";
import { deleteSetting, readJsonSetting, writeJsonSetting } from "@/features/settings/server/settings-store";

const CONFIG_KEY = "intake_config";

/** Stored config merged over the defaults (presets merged per kind). */
export async function readConfig(): Promise<IntakeConfig> {
  const stored = await readJsonSetting<IntakeConfig>(CONFIG_KEY);
  if (!stored) return DEFAULT_CONFIG;
  return { ...DEFAULT_CONFIG, ...stored, presets: { ...DEFAULT_CONFIG.presets, ...(stored.presets ?? {}) } };
}

export type IntakeConfigUpdate = Omit<Partial<IntakeConfig>, "presets"> & { presets?: Partial<IntakeConfig["presets"]> };

export async function writeConfig(patch: IntakeConfigUpdate): Promise<IntakeConfig> {
  const current = await readConfig();
  const next: IntakeConfig = { ...current, ...patch, presets: { ...current.presets, ...(patch.presets ?? {}) } };
  await writeJsonSetting(CONFIG_KEY, next);
  return next;
}

/** Restores factory settings. */
export async function resetConfig(): Promise<IntakeConfig> {
  await deleteSetting(CONFIG_KEY);
  return DEFAULT_CONFIG;
}
