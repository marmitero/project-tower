/**
 * Integração — a JORNADA DO MVP (Master-Prompt §118, os 20 passos), do primeiro clique até
 * "fechar o navegador e voltar".
 *
 * Usa as mesmas peças do jogo real: `createGame`/`boot` (a cola do navegador), persistência por
 * `LocalStoragePersistence` sobre `MemoryStorage` (o "navegador"), relógio injetado e o MESMO passo
 * `advanceIdle` que o loop do `requestAnimationFrame` chama. Nada de atalho no estado — exceto
 * onde está escrito "ATALHO DE TESTE" (Coin para o slot 2: o custo real exige ~1.000 abates).
 *
 * Documentado em `docs/MVP_ACCEPTANCE.md` (matriz passo → teste).
 */
import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import {
  LocalStoragePersistence,
  MemoryStorage,
  bagItems,
  heroCodex,
  type GameState,
} from "@tia/game-core";
import { boot, createGame } from "../../apps/game-web/src/boot.js";

const ACCOUNT = "mvp-journey";
const START = 1_700_000_000_000;
const DT = 100; // o loop real limita o passo a 250 ms; 100 ms é mais fiel à luta

function world() {
  const persistence = new LocalStoragePersistence(new MemoryStorage());
  let now = START;
  const clock = () => now;
  const play = (state: GameState, ms: number, until?: () => boolean) => {
    for (let t = 0; t < ms; t += DT) {
      now += DT;
      state.advanceIdle(DT);
      if (until?.()) return true;
    }
    return until ? until() : true;
  };
  return { persistence, clock, play, advance: (ms: number) => (now += ms), now: () => now };
}

describe("MVP §118 — jornada completa do jogador", () => {
  it("1–18: cria o Rei, escolhe o herói, monta a equipe e joga a Torre até evoluir", async () => {
    const w = world();

    // 1–3. criar o Rei, escolher a identidade (skin) e 1 dos 4 heróis — recebe apenas aquele.
    const booted = await boot({ accountId: ACCOUNT, persistence: w.persistence, clock: w.clock, seed: 7 });
    expect(booted.state).toBeNull(); // sem save, a UI pede a criação
    const state = await createGame({
      accountId: ACCOUNT,
      persistence: w.persistence,
      clock: w.clock,
      seed: 7,
      nickname: "Dom_Jornada",
      skinId: "royal",
      heroId: "hero_kaia",
    });
    expect(state.data.king.nickname).toBe("Dom_Jornada");
    expect(state.data.king.skinId).toBe("royal");
    expect(state.data.heroes.map((h) => h.name)).toEqual(["Kaia"]);
    expect(heroCodex(state.data.heroes).filter((e) => e.hero !== null)).toHaveLength(1);

    // 4–6. montar a equipe (nada entra sozinho) e escolher o herói da Torre.
    const hero = state.data.heroes[0]!;
    expect(state.data.team.members.every((m) => m === null)).toBe(true);
    state.assignHeroToSlot(hero.id, 0);
    state.selectActiveHero(hero.id);
    expect(state.data.team.activeHeroId).toBe(hero.id);

    // 7–8. entrar em batalha e lutar 1×1.
    const battle = state.startTower();
    expect(battle.allies).toHaveLength(1);
    expect(battle.enemies).toHaveLength(1);

    // 9–11. ganhar; XP (Rei e herói) e Coin. 15. "Procurando…" (~3 s) depois da vitória.
    const xp0 = state.data.king.xp + BigInt(state.data.king.level);
    const coins0 = state.data.wallet.coins;
    expect(w.play(state, 120_000, () => state.data.wallet.coins > coins0)).toBe(true);
    expect(state.data.king.xp + BigInt(state.data.king.level) * 1_000_000_000n).toBeGreaterThan(xp0);
    expect(state.data.heroes[0]!.xp > 0 || state.data.heroes[0]!.level > 1).toBe(true);
    let searched = false;
    let minMs = Infinity;
    let maxMs = 0;
    w.play(state, 60_000, () => {
      const h = state.data.hunt;
      if (h?.kind === "searching") {
        searched = true;
        minMs = Math.min(minMs, h.durationMs);
        maxMs = Math.max(maxMs, h.durationMs);
      }
      return searched && state.activeBattle !== null; // 16. o próximo inimigo
    });
    expect(searched).toBe(true);
    expect(minMs).toBeGreaterThanOrEqual(config.searching.minMs);
    expect(maxMs).toBeLessThanOrEqual(config.searching.maxMs);
    expect(state.activeBattle).not.toBeNull();

    // 12–14, 17. jogar de verdade até aparecer equipamento; equipar; continuar; evoluir.
    const levelBefore = state.data.king.level;
    const found = w.play(state, 4 * 3_600_000, () => state.data.inventory.equipment.length > 0);
    expect(found, "nenhum equipamento em 4 h simuladas — a taxa de drop quebrou").toBe(true);
    const piece = state.data.inventory.equipment[0]!;
    const { item } = state.equip(hero.id, piece.id);
    expect(state.heroById(hero.id)!.equipped[item.slot]).toBe(item.id);
    expect(bagItems(state.data.inventory, state.data.heroes).some((e) => e.id === item.id)).toBe(false); // saiu da mochila
    expect(w.play(state, 600_000, () => state.data.king.level > levelBefore)).toBe(true); // 17. melhora
    expect(state.data.king.level).toBeGreaterThan(levelBefore);

    // 5. desbloquear slots: Rei nv 10 + Coin. (ATALHO DE TESTE: o Coin; o nível é jogado.)
    expect(w.play(state, 8 * 3_600_000, () => state.data.king.level >= 10)).toBe(true);
    expect(() => state.unlockTeamSlot(1)).toThrow(); // sem Coin suficiente
    (state.data as unknown as { wallet: { coins: bigint } }).wallet.coins += 10_000_000n;
    state.unlockTeamSlot(1);
    expect(state.data.team.unlockedSlots).toBeGreaterThanOrEqual(2);

    // 18. avançar na Torre: o andar 2 abre no nível 10 e vencer lá registra o melhor andar.
    expect(state.highestUnlockedFloor).toBeGreaterThanOrEqual(2);
    state.selectFloor(2);
    state.restartHunt();
    expect(w.play(state, 4 * 3_600_000, () => state.data.tower.bestFloor >= 2)).toBe(true);
    expect(state.data.tower.currentFloor).toBe(2);
  }, 60_000);

  it("19–20: fecha o navegador, volta horas depois e recupera o progresso offline (teto Free de 2 h)", async () => {
    const w = world();
    const first = await createGame({
      accountId: ACCOUNT,
      persistence: w.persistence,
      clock: w.clock,
      seed: 11,
      nickname: "Dom_Offline",
      skinId: "royal",
      heroId: "hero_aldric",
    });
    const hero = first.data.heroes[0]!;
    first.assignHeroToSlot(hero.id, 0);
    first.selectActiveHero(hero.id);
    first.startTower();
    w.play(first, 90_000);
    first.markActive();
    await first.save(); // o navegador fecha: o loop grava em `beforeunload`/`pagehide`
    const xpBefore = first.data.king.xp;
    const lvBefore = first.data.king.level;
    const coinsBefore = first.data.wallet.coins;

    // "fecha o navegador" — nada roda — e volta 5 h depois (o teto Free é 2 h).
    w.advance(5 * 3_600_000);
    const { state: back } = await boot({ accountId: ACCOUNT, persistence: w.persistence, clock: w.clock, seed: 11 });
    expect(back).not.toBeNull();
    const claim = back!.claimOffline();
    expect(claim.wasCapped).toBe(true);
    expect(claim.creditedDurationMs).toBe(config.offline.capFreeMs);
    expect(claim.rawDurationMs).toBeGreaterThanOrEqual(5 * 3_600_000 - 5_000);

    // Progresso preservado e acrescido; relatório pronto para o "Bem-vindo de volta".
    expect(back!.data.king.nickname).toBe("Dom_Offline");
    expect(back!.data.king.level).toBeGreaterThanOrEqual(lvBefore);
    expect(back!.data.king.xp > xpBefore || back!.data.king.level > lvBefore).toBe(true);
    expect(back!.data.wallet.coins).toBeGreaterThan(coinsBefore);
    expect(back!.offlineReport).not.toBeNull();
    expect(back!.offlineReport!.battlesWon).toBeGreaterThan(0);

    // Reabrir de novo logo em seguida NÃO paga o offline duas vezes.
    const again = back!.claimOffline();
    expect(again.creditedDurationMs).toBeLessThan(60_000);
  }, 60_000);
});
