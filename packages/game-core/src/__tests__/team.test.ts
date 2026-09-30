import { describe, expect, it } from "vitest";
import { config } from "@tia/config";
import { placeHero, removeHero, setActiveHero, requireActiveHero, slotRequirement, unlockSlot, teamHeroes, NoActiveHeroError, SlotLockedError, InsufficientFundsError } from "../team.js";
import { ACCOUNT, COIN_MILLION, heroId, makeHero, makeKing, makeTeam } from "./fixtures.js";

describe("requisitos de slot (§15, §46)", () => {
  it("slot 1: nível 1, grátis", () => {
    const req = slotRequirement(0);
    expect(req.kingLevel).toBe(1);
    expect(req.costCoin).toBe(0);
  });

  it("slot 2: nível 10 do Rei + Coin", () => {
    const req = slotRequirement(1);
    expect(req.kingLevel).toBe(10);
    expect(req.costCoin).toBeGreaterThan(0);
  });

  it("slot 3: nível 25 do Rei + Coin", () => {
    const req = slotRequirement(2);
    expect(req.kingLevel).toBe(25);
    expect(req.costCoin).toBeGreaterThan(0);
  });

  it("exige nível do REI, não do herói (§46 — o nível do Rei é o da conta)", () => {
    const { king } = makeKing(9);
    const team = makeTeam();
    expect(() => unlockSlot(team, king, { accountId: ACCOUNT, coins: COIN_MILLION, diamonds: 0n }, 1)).toThrow(SlotLockedError);
  });

  it("o custo em Coin vem da config, não de um literal no código (§105)", () => {
    expect(slotRequirement(1).costCoin).toBe(config.team.slots[1].costCoin);
    expect(slotRequirement(2).costCoin).toBe(config.team.slots[2].costCoin);
  });
});

describe("desbloqueio de slot", () => {
  it("bloqueia sem nível mesmo com Coin infinito", () => {
    const { king } = makeKing(1);
    const wallet = { accountId: ACCOUNT, coins: 10n ** 12n, diamonds: 0n };
    expect(() => unlockSlot(makeTeam(), king, wallet, 1)).toThrow(SlotLockedError);
  });

  it("bloqueia sem Coin mesmo com nível alto", () => {
    const { king } = makeKing(99);
    const wallet = { accountId: ACCOUNT, coins: 0n, diamonds: 0n };
    expect(() => unlockSlot(makeTeam(), king, wallet, 1)).toThrow(InsufficientFundsError);
  });

  it("exige nível E Coin simultaneamente", () => {
    const { king } = makeKing(10);
    const wallet = { accountId: ACCOUNT, coins: BigInt(config.team.slots[1].costCoin), diamonds: 0n };
    const result = unlockSlot(makeTeam(), king, wallet, 1);
    expect(result.unlockedSlots).toBe(2);
  });

  it("cobra o valor exato da config", () => {
    const { king } = makeKing(10);
    const wallet = { accountId: ACCOUNT, coins: BigInt(config.team.slots[1].costCoin), diamonds: 0n };
    unlockSlot(makeTeam(), king, wallet, 1);
    expect(wallet.coins).toBe(0n);
  });

  it("NÃO consome Coin quando falta o nível (falha é atômica)", () => {
    const { king } = makeKing(9);
    const wallet = { accountId: ACCOUNT, coins: COIN_MILLION, diamonds: 0n };
    expect(() => unlockSlot(makeTeam(), king, wallet, 1)).toThrow();
    expect(wallet.coins).toBe(COIN_MILLION);
  });

  it("NÃO consome nível quando falta Coin (falha é atômica)", () => {
    const { king } = makeKing(10);
    const wallet = { accountId: ACCOUNT, coins: 0n, diamonds: 0n };
    expect(() => unlockSlot(makeTeam(), king, wallet, 1)).toThrow();
    expect(king.level).toBe(10);
  });

  it("não deixa pular do slot 1 direto para o 3", () => {
    const { king } = makeKing(99);
    const wallet = { accountId: ACCOUNT, coins: COIN_MILLION, diamonds: 0n };
    expect(() => unlockSlot(makeTeam(), king, wallet, 2)).toThrow(/ordem/);
  });

  it("slot 1 já nasce liberado e não cobra nada", () => {
    const { king } = makeKing(1);
    const wallet = { accountId: ACCOUNT, coins: 0n, diamonds: 0n };
    expect(() => unlockSlot(makeTeam(), king, wallet, 0)).toThrow(/já está disponível/);
  });

  it("desbloquear o 3 exige ter o 2 antes", () => {
    const { king } = makeKing(30);
    const wallet = { accountId: ACCOUNT, coins: COIN_MILLION, diamonds: 0n };
    const team = makeTeam();
    unlockSlot(team, king, wallet, 1);
    const result = unlockSlot(team, king, wallet, 2);
    expect(result.unlockedSlots).toBe(3);
  });

  it("nunca ultrapassa 3 slots (§16)", () => {
    expect(config.team.maxSize).toBe(3);
    expect(config.team.slots).toHaveLength(3);
  });
});

describe("composição da equipe", () => {
  it("não aceita colocar herói em slot bloqueado", () => {
    const team = makeTeam();
    expect(() => placeHero(team, heroId(1), 1)).toThrow(SlotLockedError);
  });

  it("não aceita o mesmo herói duas vezes", () => {
    const team = makeTeam();
    placeHero(team, heroId(1), 0);
    expect(() => placeHero(team, heroId(1), 0)).toThrow(/já está na equipe/);
  });

  it("remove herói limpa o slot", () => {
    const team = makeTeam();
    placeHero(team, heroId(1), 0);
    expect(removeHero(team, 0)).toBe(heroId(1));
    expect(team.members[0]).toBeNull();
  });

  it("remove o herói ativo desativa a escolha", () => {
    const team = makeTeam();
    placeHero(team, heroId(1), 0);
    setActiveHero(team, heroId(1));
    removeHero(team, 0);
    expect(team.activeHeroId).toBeNull();
  });
});

describe("herói ativo (§19 — o jogador escolhe)", () => {
  it("NENHUM herói é ativo por padrão", () => {
    const team = makeTeam();
    expect(team.activeHeroId).toBeNull();
  });

  it("a Torre não roda sem escolha explícita", () => {
    const team = makeTeam();
    placeHero(team, heroId(1), 0);
    expect(() => requireActiveHero(team)).toThrow(NoActiveHeroError);
  });

  it("colocar um herói na equipe NÃO o torna ativo", () => {
    const team = makeTeam();
    placeHero(team, heroId(1), 0);
    expect(team.activeHeroId).toBeNull();
  });

  it("só um herói da equipe pode ser ativado", () => {
    const team = makeTeam();
    expect(() => setActiveHero(team, heroId(9))).toThrow(/não está na equipe/);
  });

  it("a escolha é explícita e reversível", () => {
    const team = makeTeam();
    placeHero(team, heroId(1), 0);
    setActiveHero(team, heroId(1));
    expect(requireActiveHero(team)).toBe(heroId(1));
  });
});

describe("mapeamento equipe → heróis", () => {
  it("a ordem segue os slots, não a ordem do roster", () => {
    const team = makeTeam();
    const a = makeHero(0);
    const b = makeHero(1);
    placeHero(team, b.id, 0);
    expect(teamHeroes(team, [a, b])).toEqual([b]);
  });

  it("slots vazios não viram herói", () => {
    const team = makeTeam();
    const roster = [makeHero(0), makeHero(1)];
    placeHero(team, roster[1]!.id, 0);
    expect(teamHeroes(team, roster)).toHaveLength(1);
  });
});
