/**
 * SFX do HUD e da batalha (§60) — `HTMLAudio` leve sobre os 22 WAVs
 * gerados em `assets/generated/audio/sfx/`. Sem WebAudio: o áudio é
 * puramente reativo (disparo por evento), nada de música/loop agora.
 */
import { assetUrl, loadAssetManifest } from "./assets";
import { getSettings } from "../settings";

const cache = new Map<string, HTMLAudioElement>();
/** Toca um efeito do manifesto (`audio/sfx/<id>`). Falhas ficam mudas. */
export function playSfx(id: string, volume?: number): void {
  try {
    // Opções do jogador (som ligado/volume). Padrão em `settings.ts`.
    const prefs = getSettings();
    if (!prefs.sfxEnabled) return;
    volume = volume ?? prefs.sfxVolume;
    let a = cache.get(id);
    if (!a) {
      const url = assetUrl(id);
      if (!url) return;
      a = new Audio(url);
      a.volume = volume;
      cache.set(id, a);
    }
    // Reexecução: clona para sobrepor o mesmo som (dois hits em sequência).
    const node = a.paused ? a : (a.cloneNode(true) as HTMLAudioElement);
    node.volume = volume;
    void node.play().catch(() => undefined);
  } catch {
    // Áudio nunca derruba o jogo (ex.: autoplay bloqueado antes do 1º gesto).
  }
}

/** Garante o manifesto carregado antes do primeiro `playSfx`. */
export async function preloadSfx(): Promise<void> {
  await loadAssetManifest();
}
