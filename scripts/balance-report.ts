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
import { HEROES, classes, config, enemies } from "@tia/config";
import { asAccountId } from "@tia/contracts";
import { GameState, averageBossFight, averageDuel, coinsPerKillFor, floorMatchups, itemPrice, rollGearSet, simulateHunt, towerPacing } from "@tia/game-core";

const md = process.argv.includes("--md");
const CYCLE = 15;
const h = (n: number) => (n < 1 ? `${Math.max(1, Math.round(n * 60))} min` : n < 100 ? `${n.toFixed(1)} h` : `${Math.round(n)} h`);
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const out: string[] = [];
const line = (s = "") => out.push(s);
const title = (s: string) => (md ? line(`\n## ${s}\n`) : line(`\n=== ${s} ===`));

line(md ? "# Relatório de balanceamento — Torre (gerado)" : "RELATÓRIO DE BALANCEAMENTO — TORRE");
line(md ? "\n> Gerado por `npm run -s report:balance -- --md > docs/BALANCE_REPORT.md`. Não edite à mão." : "");

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

title("Equipamento: efeito de um conjunto completo (nível 500, média de 6 conjuntos sorteados × 6 inimigos)");
{
  const rows: string[] = [];
  const scenarios: Array<[string, { rarity?: "common" | "celestial"; x?: number } | null]> = [
    ["sem equipamento", null],
    ["conjunto médio (drop real)", {}],
    ["tudo Comum, X 1,0", { rarity: "common", x: 1 }],
    ["tudo Celestial, X 2,5 (god roll)", { rarity: "celestial", x: 2.5 }],
  ];
  for (const [label, opts] of scenarios) {
    const per = classes.map((c) => {
      const sets = opts === null ? [undefined] : Array.from({ length: 6 }, (_, i) => rollGearSet(c.id, lvl, i + 1, opts));
      let lost = 0, dur = 0, n = 0;
      for (const gear of sets) for (const e of enemies.slice(0, 6)) {
        const r = averageDuel({ classId: c.id, heroLevel: lvl, enemyId: e.id, enemyLevel: lvl, gear }, 2);
        lost += r.avgHpLostFraction; dur += r.avgDurationSec; n += 1;
      }
      return { id: c.id, lost: lost / n, dur: dur / n };
    });
    rows.push(`${md ? "- " : ""}${label}: ${per.map((p) => `${p.id} ${pct(p.lost)} / ${p.dur.toFixed(1)} s`).join(" · ")}`);
  }
  for (const r of rows) line(r);
  const sample = rollGearSet("guardian", lvl, 3);
  line(`${md ? "- " : ""}Conjunto-exemplo (guardian): ${sample.items.map((i) => `${i.slot} ${i.rarity}/${i.grade}`).join(", ")}`);
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

title("Market — preços e caixas (ADR-025; 1 abate ≈ 1 ciclo de 15 s)");
{
  const need = config.heroAcquisition.fragmentsRequired;
  const coinPerKill = (kingLevel: number) => coinsPerKillFor(kingLevel);
  for (const kingLevel of [1, 100, 2500]) {
    const fixed = config.market.items.filter((i) => i.kind === "consumable" && i.price.kind === "fixed");
    line(`${md ? "- " : ""}Poções de cura fixa em abates (Rei Nv ${kingLevel}, ${coinPerKill(kingLevel)} Coin/abate): ${fixed.map((i) => `${i.name} ${(Number(itemPrice(i, kingLevel)) / coinPerKill(kingLevel)).toFixed(1)}`).join(" · ")}`);
  }
  for (const it of config.market.items) {
    if (it.kind !== "box") continue;
    const total = it.outcomes.reduce((s, o) => s + o.weight, 0);
    const avgFrag = (it.fragments.min + it.fragments.max) / 2;
    let heroEq = 0;
    let heroChance = 0;
    for (const o of it.outcomes) {
      const p = o.weight / total;
      if (o.kind === "hero") {
        heroChance += p;
        if (o.rarity === it.rarity) heroEq += p;
      } else heroEq += (p * avgFrag) / need[o.rarity];
    }
    const price = itemPrice(it, it.requiredKingLevel);
    const kills = Number(price) / coinPerKill(it.requiredKingLevel);
    const boxes = 1 / heroEq;
    line(`${md ? "- " : ""}${it.name}: Rei Nv ${it.requiredKingLevel}+, ${price.toLocaleString("pt-BR")} Coin ≈ ${kills.toFixed(0)} abates (${h((kills * CYCLE) / 3600)}) por caixa; herói completo direto ${(heroChance * 100).toFixed(1)}%; ≈ ${boxes.toFixed(1)} caixas por herói da raridade (${h((boxes * kills * CYCLE) / 3600)} de caça)`);
  }
}

title("Chefes da Arena (heróis no nível do chefe, sem equipamento, sem Bot)");
{
  const teams: Array<[string, string[]]> = [
    ["1 herói", ["guardian"]],
    ["2 heróis", ["guardian", "ranger"]],
    ["3 heróis", ["guardian", "ranger", "arcanist"]],
  ];
  if (md) {
    line("| Chefe | Nv Rei | Nv chefe | Limite | Recarga (vitória/derrota) | 1 herói | 2 heróis | 3 heróis |");
    line("|---|---:|---:|---:|---|---|---|---|");
  }
  for (const b of config.boss.bosses) {
    const cells = teams.map(([, ids]) => {
      const r = averageBossFight({ bossId: b.id, classIds: ids, heroLevel: b.level }, 6);
      return `${pct(r.winRate)} · ${r.avgDurationSec.toFixed(0)} s · -${pct(r.avgTeamHpLost)} HP`;
    });
    const cd = b.attempts.kind === "cooldown" ? `${Math.round(b.attempts.afterWinMs / 60000)} min / ${Math.round(b.attempts.afterLossMs / 60000)} min` : b.attempts.kind === "window" ? `${b.attempts.maxAttempts} por ${Math.round(b.attempts.windowMs / 60000)} min` : "sem limite";
    if (md) line(`| ${b.name} | ${b.requiredKingLevel} | ${b.level} | ${Math.round(b.timeLimitMs / 1000)} s | ${cd} | ${cells.join(" | ")} |`);
    else line(`${b.name} (Rei ${b.requiredKingLevel}, nv ${b.level}): ${teams.map(([n], i) => `${n} ${cells[i]}`).join(" | ")}`);
  }
}

// ---------------------------------------------------------------------------
// Ritmo das primeiras horas — o jogo REAL (GameState + advanceIdle), sem atalhos
// ---------------------------------------------------------------------------
{
  title("Ritmo das primeiras 4 horas (jogo real, sem atalhos: não equipa, não vende e fica no andar 1)");
  const HOURS = 4;
  const MARKS: Array<[string, (s: GameState) => boolean]> = [
    ["1º drop de equipamento", (s) => s.data.inventory.equipment.length > 0],
    ["Rei nv 5", (s) => s.data.king.level >= 5],
    ["Rei nv 10 (abre Slot 2, andar 2 e a Arena)", (s) => s.data.king.level >= 10],
    ["Rei nv 25 (abre Slot 3)", (s) => s.data.king.level >= 25],
    ["Rei nv 50", (s) => s.data.king.level >= 50],
  ];
  if (md) {
    line(`| Herói inicial | ${MARKS.map(([n]) => n).join(" | ")} | Rei após ${HOURS} h | Coin após ${HOURS} h | Mochila após ${HOURS} h |`);
    line(`|---|${MARKS.map(() => "---:").join("|")}|---:|---:|---:|`);
  }
  for (const identity of HEROES) {
    let now = 1_700_000_000_000;
    const st = GameState.createNew(
      { accountId: asAccountId(`pace-${identity.id}`), nickname: "Ritmo", skinId: "royal", starterIdentityId: identity.id, now, masterSeed: 5 },
      { now: () => now },
    );
    const hero = st.data.heroes[0]!;
    st.assignHeroToSlot(hero.id, 0);
    st.selectActiveHero(hero.id);
    st.startTower();
    const at: Array<number | null> = MARKS.map(() => null);
    for (let t = 0; t < HOURS * 3_600_000; t += 250) {
      now += 250;
      st.advanceIdle(250);
      MARKS.forEach(([, test], i) => {
        if (at[i] === null && test(st)) at[i] = t / 3_600_000;
      });
    }
    const cells = at.map((v) => (v === null ? "—" : h(v)));
    const tail = [`nv ${st.data.king.level}`, st.data.wallet.coins.toLocaleString("pt-BR"), String(st.data.inventory.equipment.length)];
    if (md) line(`| ${identity.name} | ${cells.join(" | ")} | ${tail.join(" | ")} |`);
    else line(`${identity.name}: ${MARKS.map(([n], i) => `${n} ${cells[i]}`).join(" · ")} · após ${HOURS} h: ${tail.join(" / ")}`);
  }
}

line(`\nParâmetros: defesa K = ${config.combat.defenseConstant} + ${config.combat.defenseConstantPerLevel}×(nível−1); regen ${config.combat.regenOnSearchingPctPerSec * 100}%/s em PROCURANDO; inimigos HP×${config.tower.enemyHpMultiplier}, Ataque×${config.tower.enemyAttackMultiplier}.`);
console.log(out.join("\n"));
