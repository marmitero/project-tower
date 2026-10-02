/**
 * Gate da FASE 5 — desbloqueio de slot pelo ESTADO (§15, §46).
 *
 * O nível unitário (funções puras de `team.ts`) vive em `team.test.ts`.
 * Este arquivo cobre o que o gate da fase exige: o mesmo comportamento
 * passando pela classe `GameState` — o objeto que a UI realmente toca —
 * incluindo a débito de Coin no wallet e a persistência do desbloqueio.
 */

import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { GameState } from "../state.js";
import { SlotLockedError, InsufficientFundsError } from "../team.js";
import { LocalStoragePersistence, MemoryStorage } from "../persistence/local.js";
import { asAccountId } from "@tia/contracts";

const ACCOUNT = asAccountId("slot-unlock-account");

function makeState(kingLevel = 1, coins = 0n) {
  let now = 1_000;
  const state = GameState.createNew(
    { accountId: ACCOUNT, nickname: "Testador", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 7 },
    { now: () => now },
  );
  const d = state.data as unknown as { king: { level: number }; wallet: { coins: bigint } };
  d.king.level = kingLevel;
  d.wallet.coins = coins;
  return state;
}

describe("unlockTeamSlot via GameState (§15 — nível do Rei + Coin)", () => {
  it("slot 2 desbloqueia com Rei nível 10 e cobra exatamente o valor da config", () => {
    const cost = BigInt(config.team.slots[1]!.costCoin);
    const state = makeState(10, cost * 10n);

    const spent = state.unlockTeamSlot(1);

    expect(spent).toBe(cost);
    expect(state.data.team.unlockedSlots).toBe(2);
    expect(state.data.wallet.coins).toBe(cost * 10n - cost);
  });

  it("slot 3 exige o slot 2 antes e cobra o valor da config", () => {
    const cost2 = BigInt(config.team.slots[1]!.costCoin);
    const cost3 = BigInt(config.team.slots[2]!.costCoin);
    const state = makeState(25, cost2 + cost3);

    state.unlockTeamSlot(1);
    const spent = state.unlockTeamSlot(2);

    expect(spent).toBe(cost3);
    expect(state.data.team.unlockedSlots).toBe(3);
    expect(state.data.wallet.coins).toBe(0n);
  });

  it("sem nível suficiente, lança SlotLockedError e não consome Coin", () => {
    const state = makeState(9, 1_000_000n);
    expect(() => state.unlockTeamSlot(1)).toThrow(SlotLockedError);
    expect(state.data.wallet.coins).toBe(1_000_000n);
    expect(state.data.team.unlockedSlots).toBe(1);
  });

  it("sem Coin suficiente, lança InsufficientFundsError e não consome nada", () => {
    const state = makeState(50, 1n);
    expect(() => state.unlockTeamSlot(1)).toThrow(InsufficientFundsError);
    expect(state.data.wallet.coins).toBe(1n);
    expect(state.data.team.unlockedSlots).toBe(1);
  });

  it("não deixa pular do slot 1 direto para o 3", () => {
    const state = makeState(50, 10_000_000n);
    expect(() => state.unlockTeamSlot(2)).toThrow(/ordem/i);
    expect(state.data.team.unlockedSlots).toBe(1);
  });

  it("o desbloqueio persiste no save (roundtrip de persistência)", async () => {
    const persistence = new LocalStoragePersistence(new MemoryStorage());
    const cost = BigInt(config.team.slots[1]!.costCoin);
    let now = 5_000;
    const state = GameState.createNew(
      { accountId: ACCOUNT, nickname: "Testador", skinId: "royal", starterIdentityId: "hero_aldric", now, masterSeed: 7 },
      { now: () => now, persistence },
    );
    (state.data as unknown as { king: { level: number }; wallet: { coins: bigint } }).king.level = 10;
    (state.data as unknown as { wallet: { coins: bigint } }).wallet.coins = cost;
    state.unlockTeamSlot(1);
    await state.save();

    const reloaded = await persistence.load(ACCOUNT);
    expect(reloaded?.team.unlockedSlots).toBe(2);
  });

  it("atribuir herói a slot bloqueado continua recusado pelo estado", () => {
    const state = makeState(1, 0n);
    const hero = state.data.heroes[0]!;
    expect(() => state.assignHeroToSlot(hero.id, 1)).toThrow(SlotLockedError);
    expect(state.data.team.members.filter(Boolean)).toHaveLength(0);
  });
});
