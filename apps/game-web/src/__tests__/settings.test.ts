import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SETTINGS_KEY, loadSettings, resetSettingsCache, sanitizeSettings, updateSettings } from "../settings.js";

function memStore(initial?: string) {
  const m = new Map<string, string>();
  if (initial !== undefined) m.set(SETTINGS_KEY, initial);
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe("settings", () => {
  beforeEach(() => resetSettingsCache());

  it("sem nada salvo usa o padrão", () => {
    expect(loadSettings(memStore())).toEqual(DEFAULT_SETTINGS);
  });
  it("lixo no storage nunca quebra: volta ao padrão", () => {
    expect(loadSettings(memStore("{não é json"))).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ sfxVolume: "alto", sfxEnabled: 3 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it("volume é limitado a 0..1", () => {
    expect(sanitizeSettings({ sfxVolume: 7 }).sfxVolume).toBe(1);
    expect(sanitizeSettings({ sfxVolume: -2 }).sfxVolume).toBe(0);
    expect(sanitizeSettings({ sfxVolume: Number.NaN }).sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume);
  });
  it("updateSettings grava e notifica; sem storage só vale na sessão", () => {
    const store = memStore();
    const next = updateSettings({ sfxEnabled: false, sfxVolume: 0.8 }, store);
    expect(next).toEqual({ sfxEnabled: false, sfxVolume: 0.8 });
    expect(JSON.parse(store.m.get(SETTINGS_KEY) as string)).toEqual(next);
    expect(updateSettings({ sfxVolume: 0.2 }, null).sfxVolume).toBe(0.2);
  });
});
