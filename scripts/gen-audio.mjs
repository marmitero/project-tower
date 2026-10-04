#!/usr/bin/env node
/**
 * Geração de SFX procedurais do jogo.
 *
 * §60/§63 — o produto precisa parecer um jogo: impacto, crítico, morte,
 * level up e loot precisam de confirmação sonora. O pack de arte não tem
 * UM arquivo de áudio (ver `docs/ASSET_GAP.md` §3.1) e o repositório de
 * referência confirma: "KNOWN LIMITATIONS: ... no audio".
 *
 * Por que gerar e não comprar/baixar: a alternativa CC0/pack pago é uma
 * decisão de produto que não foi tomada; ficar sem som viola o §62 tanto
 * quanto entregar placeholder. SFX sintetizados são arte FINAL do projeto
 * (não placeholder), versionada e sem dependência externa — e podem ser
 * substituídos por um pack profissional depois sem mudar um único ID, pois
 * o manifesto é a fronteira (`docs/AUDIO_GUIDELINES.md` §3).
 *
 * Especificação (AUDIO_GUIDELINES §4): WAV mono 44,1 kHz 16 bits (formato
 * de trabalho universal; a compressão Ogg/Opus é tarefa do pipeline de
 * release), SFX < 2 s, pico normalizado a ≈ −1 dBTP.
 *
 * SAÍDA: `assets/generated/audio/sfx/*.wav` + metadados no manifesto do
 * pipeline (`scripts/build-assets.mjs`).
 *
 * Uso: node scripts/gen-audio.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "assets/generated/audio/sfx");

const SR = 44100;

// ─────────────────────────── primitivas de síntese ───────────────────────────

const TAU = Math.PI * 2;

function buffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SR));
}

function sine(freq, t) {
  return Math.sin(TAU * freq * t);
}

function tri(freq, t) {
  const p = (t * freq) % 1;
  return 4 * Math.abs(p - 0.5) - 1;
}

function sqr(freq, t) {
  return Math.sin(TAU * freq * t) >= 0 ? 1 : -1;
}

let noiseState = 22222;
function noise() {
  // xorshift32 — determinístico para que o build seja reprodutível.
  noiseState ^= noiseState << 13;
  noiseState ^= noiseState >>> 17;
  noiseState ^= noiseState << 5;
  return (noiseState / 0xffffffff) * 2 - 1;
}

/** Envelope ADSR simples em amostras. */
function adsr(n, a, d, s, r) {
  const env = new Float32Array(n);
  const A = a * SR, D = d * SR, R = r * SR;
  const S = Math.max(0, n - A - D - R);
  for (let i = 0; i < n; i++) {
    let v;
    if (i < A) v = i / A;
    else if (i < A + D) v = 1 + (s - 1) * ((i - A) / D);
    else if (i < A + D + S) v = s;
    else v = s * (1 - (i - A - D - S) / R);
    env[i] = Math.max(0, v);
  }
  return env;
}

/** Filtro passa-baixa de um polo (quente/análogo). */
function lowpass(data, cutoff) {
  const k = Math.min(1, (TAU * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    y += k * (data[i] - y);
    data[i] = y;
  }
  return data;
}

function highpass(data, cutoff) {
  const k = Math.min(1, (TAU * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    y += k * (data[i] - y);
    data[i] = data[i] - y;
  }
  return data;
}

function mix(...layers) {
  const n = Math.max(...layers.map((l) => l.length));
  const out = new Float32Array(n);
  for (const layer of layers) {
    for (let i = 0; i < layer.length; i++) out[i] += layer[i];
  }
  return out;
}

function normalize(data, peak = 0.89) {
  let max = 0;
  for (const v of data) max = Math.max(max, Math.abs(v));
  if (max === 0) return data;
  const g = peak / max;
  for (let i = 0; i < data.length; i++) data[i] *= g;
  return data;
}

function toWav(data) {
  const n = data.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(data[i] * 32767))), 44 + i * 2);
  }
  return buf;
}

// ─────────────────────────────── receitas ───────────────────────────────

/** Impacto físico: thump grave + estouro de ruído curto. */
function hit(dur = 0.16, bright = 1) {
  const n = buffer(dur);
  const thumpF = 110;
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const f = thumpF * (1 + 2.2 * Math.exp(-t * 40)); // glide para baixo
    n[i] = sine(f, t) * Math.exp(-t * 22) * 0.9;
  }
  const nz = buffer(dur * 0.6);
  for (let i = 0; i < nz.length; i++) nz[i] = noise() * Math.exp((-i / SR) * 60);
  lowpass(nz, 2600 * bright);
  return normalize(mix(n, nz));
}

/** Crítico: impacto encorpado + brilho metálico — inequívoco (§60). */
function critical() {
  const base = hit(0.22, 1.6);
  const shimmer = buffer(0.5);
  for (let i = 0; i < shimmer.length; i++) {
    const t = i / SR;
    shimmer[i] = (sine(1180, t) + 0.7 * sine(1770, t) + 0.5 * sine(2360, t)) * Math.exp(-t * 9) * 0.32;
  }
  return normalize(mix(base, shimmer));
}

/** Golpe de skill: zap FM descendente + quemada de ar. */
function skill() {
  const n = buffer(0.55);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const carrier = 720 * Math.exp(-t * 2.2) + 160;
    const mod = sine(carrier * 1.5, t) * 240 * Math.exp(-t * 6);
    n[i] = Math.sin(TAU * carrier * t + mod / 100) * Math.exp(-t * 5) * 0.8;
  }
  const air = buffer(0.4);
  for (let i = 0; i < air.length; i++) {
    const t = i / SR;
    air[i] = noise() * Math.exp(-t * 7) * 0.35;
  }
  highpass(air, 900);
  return normalize(mix(n, air));
}

/** Erro/ataque perdido: swish suave. */
function miss() {
  const n = buffer(0.22);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    n[i] = noise() * Math.exp(-t * 16) * 0.7;
  }
  highpass(n, 700);
  lowpass(n, 1800);
  return normalize(n);
}

/** Morte de inimigo: tom em queda + colapso de ruído. */
function deathEnemy() {
  const n = buffer(0.7);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const f = 320 * Math.exp(-t * 3.4) + 46;
    n[i] = (sine(f, t) * 0.7 + tri(f * 0.5, t) * 0.3) * Math.exp(-t * 3.2);
  }
  const nz = buffer(0.5);
  for (let i = 0; i < nz.length; i++) nz[i] = noise() * Math.exp((-i / SR) * 8) * 0.4;
  lowpass(nz, 900);
  return normalize(mix(n, nz));
}

/** Morte de herói: mais grave e longa — peso emocional. */
function deathHero() {
  const n = buffer(1.0);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const f = 220 * Math.exp(-t * 2.2) + 36;
    n[i] = (sine(f, t) * 0.8 + tri(f * 0.5, t) * 0.2) * Math.exp(-t * 2.4);
  }
  return normalize(n);
}

/** Acorde/arp genérico com brilho. */
function arp(freqs, step, tail, decay = 5) {
  const n = buffer(step * freqs.length + tail);
  for (let k = 0; k < freqs.length; k++) {
    const start = Math.floor(k * step * SR);
    for (let i = 0; i < tail * SR && start + i < n.length; i++) {
      const t = i / SR;
      n[start + i] += (sine(freqs[k], t) * 0.6 + sine(freqs[k] * 2, t) * 0.25) * Math.exp(-t * decay);
    }
  }
  return normalize(n);
}

/** Vitória: fanfarra em arpejo ascendente. */
function victory() {
  return arp([392, 494, 587, 784, 988], 0.11, 0.55, 6);
}

/** Derrota: arpejo descendente menor. */
function defeat() {
  return arp([440, 392, 330, 262], 0.16, 0.6, 4.5);
}

/** Level up: arp ascendente com shimmer. */
function levelup() {
  const base = arp([523, 659, 784, 1047, 1319], 0.085, 0.5, 7);
  const shimmer = buffer(0.8);
  for (let i = 0; i < shimmer.length; i++) {
    const t = i / SR;
    shimmer[i] = (sine(2093, t) + sine(2637, t)) * 0.12 * Math.exp(-t * 5) * (0.6 + 0.4 * Math.sin(TAU * 9 * t));
  }
  return normalize(mix(base, shimmer));
}

/**
 * Drops por raridade: a ESCADA de som (§108) — cada raridade é
 * objetivamente mais aguda e mais longa que a anterior.
 */
function drop(level) {
  const roots = [440, 523, 659, 784, 988];
  const root = roots[level];
  const notes = [root, root * 1.26, root * 1.5, root * 2];
  const n = buffer(0.45 + level * 0.18);
  for (let k = 0; k < notes.length; k++) {
    const start = Math.floor(k * (0.075 + level * 0.012) * SR);
    for (let i = 0; i < 0.4 * SR && start + i < n.length; i++) {
      const t = i / SR;
      n[start + i] += (sine(notes[k], t) * 0.55 + sine(notes[k] * 2.01, t) * 0.22) * Math.exp(-t * (8 - level * 0.9));
    }
  }
  return normalize(n);
}

/** Moeda: dois pings metálicos rápidos. */
function coin() {
  const n = buffer(0.3);
  for (const [start, f] of [[0, 1320], [0.07, 1760]]) {
    const s0 = Math.floor(start * SR);
    for (let i = 0; i < 0.22 * SR && s0 + i < n.length; i++) {
      const t = i / SR;
      n[s0 + i] += (sine(f, t) + 0.5 * sine(f * 1.51, t)) * Math.exp(-t * 22) * 0.55;
    }
  }
  return normalize(n);
}

function click() {
  const n = buffer(0.09);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    n[i] = sine(900, t) * Math.exp(-t * 90) * 0.7 + noise() * Math.exp(-t * 160) * 0.3;
  }
  return normalize(n);
}

function back() {
  const n = buffer(0.12);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    n[i] = sine(520, t) * Math.exp(-t * 70) * 0.7 + noise() * Math.exp(-t * 130) * 0.25;
  }
  return normalize(n);
}

function errorBuzz() {
  const n = buffer(0.28);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const gate = t < 0.09 ? 1 : t < 0.15 ? 0 : t < 0.24 ? 1 : 0;
    n[i] = (sqr(150, t) * 0.5 + sine(98, t) * 0.5) * gate * Math.exp(-t * 6);
  }
  lowpass(n, 1200);
  return normalize(n);
}

/** "Procurando...": pulso suave que preenche os ~3s (§28) sem irritar. */
function searching() {
  const n = buffer(1.0);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const lfo = 0.5 + 0.5 * Math.sin(TAU * 1.2 * t);
    n[i] = (sine(220, t) * 0.4 + noise() * 0.25) * lfo * Math.exp(-t * 0.8);
  }
  lowpass(n, 800);
  return normalize(n, 0.55);
}

function heal() {
  const n = buffer(0.65);
  for (let i = 0; i < n.length; i++) {
    const t = i / SR;
    const f = 440 + 220 * (1 - Math.exp(-t * 3));
    n[i] = (sine(f, t) * 0.5 + sine(f * 1.5, t) * 0.25) * Math.exp(-t * 4) * (0.7 + 0.3 * Math.sin(TAU * 6 * t));
  }
  return normalize(n);
}

const SFX = {
  "hit_01": () => hit(0.16, 1.0),
  "hit_02": () => hit(0.14, 1.25),
  "hit_03": () => hit(0.18, 0.85),
  "critical": critical,
  "skill": skill,
  "miss": miss,
  "death_enemy": deathEnemy,
  "death_hero": deathHero,
  "victory": victory,
  "defeat": defeat,
  "levelup": levelup,
  "drop_common": () => drop(0),
  "drop_rare": () => drop(1),
  "drop_epic": () => drop(2),
  "drop_legendary": () => drop(3),
  "drop_celestial": () => drop(4),
  "coin": coin,
  "click": click,
  "back": back,
  "error": errorBuzz,
  "searching": searching,
  "heal": heal,
};

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const [id, fn] of Object.entries(SFX)) {
    noiseState = 22222; // determinismo por efeito
    const wav = toWav(normalize(fn()));
    await writeFile(join(OUT, `${id}.wav`), wav);
    console.log(`[audio] ${id}.wav  ${(wav.length / 1024).toFixed(0)} KiB`);
  }
  console.log(`\n[audio] ${Object.keys(SFX).length} SFX gerados em assets/generated/audio/sfx`);
}

main().catch((error) => {
  console.error("[audio] erro:", error);
  process.exit(1);
});
