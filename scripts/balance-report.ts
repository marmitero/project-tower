/**
 * Relatório de balanceamento da Torre (ADR-021).
 *
 *   npm run report:balance            → imprime no terminal
 *   npm run report:balance -- --md    → gera Markdown (usado em docs/BALANCE_REPORT.md)
 *
 * Lê a config VIVA (andares, curvas, atributos) e roda o engine real. Mudou
 * um número em `packages/config`? Rode isto e veja o efeito antes de commitar.
 * O Painel Admin (FASE 14) vai expor esta mesma API como pré-visualização.
 */
import { classes, config, enemies } from "@tia/config";
import { averageDuel, floorMatchups, simulateHunt, towerPacing } from "@tia/game-core";

const md = process.argv.includes("--md");
const CYCLE = 15;
const h = (n: number) => (n < 1 ? `${Math.max(1, Math.round(n * 60))} min` : n < 100 ? `${n.toFixed(1)} h` : `${Math.round(n)} h`);
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const out: string[] = [];
const line = (s = "") => out.push(s);
const title = (s: string) => (md ? line(`\n## ${s}\n`) : line(`\n=== ${s} ===`));

line(md ? "# Relatório de balanceamento — Torre (gerado)" : "RELATÓRIO DE BALANCEAMENTO — TORRE");
line(md ? "\n> Gerado por `npm run report:balance -- --md`. Não edite à mão." : "");

title("Pacing do Rei por andar (ciclo luta+procura ≈ 15 s)");
const pacing = towerPacing(CYCLE);
if (md) {
  line("| Andar | Nome | Faixa do Rei | Inimigos | Abates | Tempo | Acumulado |");
  line("|---:|---|---|---:|---:|---:|---:|");
}
for (const p of pacing) {
  const cells = [p.floor, p.name, `${p.minLevel}–${p.maxLevel}`, `nv ${p.enemyLevel}`, p.kills, h(p.hours), h(p.cumulativeHours)];
  line(md ? `| ${cells.join(" | ")} |` : cells.map((c) => String(c).padEnd(16)).join(""));
}
const total = pacing.at(-1)!.cumulativeHours;
line(md ? `\n**Total:** ${h(total)} de jogo ativo (≈ ${Math.round(total / 4)} dias a 4 h/dia).` : `\nTOTAL: ${h(total)} ativas (≈ ${Math.round(total / 4)} dias a 4 h/dia)`);

title("Custo de vida por papel (herói on-curve, média das 4 classes)");
const byRole = new Map<string, number[]>();
const lvl = 500;
for (const e of enemies) {
  const mean = classes.reduce((s, c) => s + averageDuel({ classId: c.id, heroLevel: lvl, enemyId: e.id, enemyLevel: lvl }, 6).avgHpLostFraction, 0) / classes.length;
  const dur = classes.reduce((s, c) => s + averageDuel({ classId: c.id, heroLevel: lvl, enemyId: e.id, enemyLevel: lvl }, 6).avgDurationSec, 0) / classes.length;
  line(`${md ? "- " : ""}${e.name} (${e.role}, ${e.damageType}): perde ${pct(mean)} da vida, luta de ${dur.toFixed(1)} s`);
  byRole.set(e.role, [...(byRole.get(e.role) ?? []), mean]);
}

title("Herói × classe (média sobre o roster, nível 500)");
for (const c of classes) {
  const m = enemies.reduce((s, e) => s + averageDuel({ classId: c.id, heroLevel: lvl, enemyId: e.id, enemyLevel: lvl }, 4).avgHpLostFraction, 0) / enemies.length;
  line(`${md ? "- " : ""}${c.name}: perde ${pct(m)} por luta`);
}

title("Sustentabilidade idle (150 lutas seguidas, regen de PROCURANDO)");
const checks: Array<[number, number]> = [[1, 1], [5, 100], [10, 2500], [11, 5000], [40, 19500]];
for (const [floor, min] of checks) {
  for (const ratio of [0.8, 0.9, 1.0, 1.05, 1.2]) {
    const lv = Math.max(1, Math.round(min * ratio));
    const res = classes.map((c) => simulateHunt({ classId: c.id, heroLevel: lv, floor, fights: 150, seed: 2 }));
    line(`${md ? "- " : ""}andar ${floor}, herói ${ratio.toFixed(2)}× o nível-base (Nv ${lv}): ${res.map((r, i) => `${classes[i]!.id} ${r.defeated ? `cai na luta ${r.fights}` : "aguenta"}`).join(" · ")}`);
  }
}

title("Matchups de um andar (herói no nível-base)");
for (const m of floorMatchups(10, 2500, 3).filter((x) => x.classId === "guardian")) {
  line(`${md ? "- " : ""}guardian × ${m.enemy.name}: ${pct(m.duel.avgHpLostFraction)} de vida, ${m.duel.avgDurationSec.toFixed(1)} s (chance ${pct(m.chance)})`);
}

line(`\nParâmetros: defesa K = ${config.combat.defenseConstant} + ${config.combat.defenseConstantPerLevel}×(nível−1); regen ${config.combat.regenOnSearchingPctPerSec * 100}%/s em PROCURANDO; inimigos HP×${config.tower.enemyHpMultiplier}, Ataque×${config.tower.enemyAttackMultiplier}.`);
console.log(out.join("\n"));
