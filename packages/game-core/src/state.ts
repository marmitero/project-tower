/**
 * GameState — o orquestrador.
 *
 * §63 — a arquitetura é GAME LOGIC → GAME STATE → GAME RENDERING → UI/HUD →
 * PERSISTENCE/API. Este módulo é o degrau "GAME STATE": ele não sabe que
 * React existe, não sabe que existe canvas e não fala com o storage
 * diretamente. Ele recebe as dependências por construtor, o que é o que
 * permite testar o ciclo inteiro sem navegador.
 *
 * A regra de ouro deste arquivo: TODA mutação de estado passa por aqui e
 * incrementa `revision`. O cliente manda `revision` no comando; o servidor
 * compara (§86 — resolve conflito por revisão, não por "último a escrever").
 */

import type {
  BattleEvent,
  BattleState,
  Equipment,
  Hero,
  RewardBundle,
  SaveData,
} from "@tia/contracts";
import type { AccountId, EquipmentId, HeroId } from "@tia/contracts";
import { heroById as heroIdentityById, classes, config, skills, type BotSettings, type ClassGrowth, type EquipSlotId, type Rarity } from "@tia/config";
import { RngHub, hashString, step, healCombatant, reviveCombatant, type Prng, type SkillDef as EngineSkillDef } from "@tia/engine";
import type { DebugContext } from "./debug.js";
import { createKing, createTeam, createWallet, createHero, activeTeamSize, changeKingSkin, heroGrowth } from "./creation.js";
import { createInventory } from "./inventory.js";
import { createOfflineProgress, beginSearching, isSearchingComplete, computeOffline, commitOffline, touchActive, rollSearchingDuration } from "./hunt.js";
import { requireActiveHero, placeHero, setActiveHero, unlockSlot, firstAssigned, removeHero } from "./team.js";
import { teamHeroes } from "./team.js";
import {
  equipItem,
  heroCombatEffects,
  heroCombatStats,
  selectForBulkSale,
  sellEquipment,
  sellMany,
  storeDrop,
  unequipItem,
  type BulkSaleFilter,
} from "./inventory.js";
import { grantHeroXp, grantKingXp, splitTeamXp } from "./progression.js";
import {
  startTowerBattle,
  resolveTowerWin,
  describeFloor,
  enemyLevelForFloor,
  clampFloor,
  floorDef,
  highestUnlockedFloor,
  TowerLockedError,
} from "./tower.js";
import {
  ShopError,
  buyShopItem,
  consumableById,
  effectAmount,
  openBoxes,
  pickPotion,
  pickRevive,
  itemPrice,
  shopItemById,
  spendOne,
  stackCount,
  summonFromFragments,
  grantFragments,
  type BoxOpening,
  type PurchaseResult,
} from "./shop.js";
import { createBotSettings, normalizeBotSettings, patchBotSettings, type BotSettingsPatch } from "./bot.js";
import { emptyReport, type OfflineReport } from "./offline.js";
import { HuntLedger, type LedgerRates } from "./ledger.js";
import {
  BossBlockedError,
  bossAvailability,
  bossById,
  createBossProgress,
  emptyBossRecord,
  normalizeBossProgress,
  recordOf,
  registerAttemptStart,
  registerResult,
  rollBossRewards,
  startBossBattle,
  type BossAvailability,
} from "./boss.js";
import type { PersistenceService } from "./persistence/types.js";
import { LocalStoragePersistence } from "./persistence/local.js";

export interface GameStateDeps {
  persistence: PersistenceService;
  /** Relógio injetado. Nunca `Date.now()` espalhado pelo código. */
  now: () => number;
  /** Semente mestra. Persistida, para que o save seja auditável. */
  masterSeed: number;
}

/** O que a UI mostra no banner de drop (ADR-023). */
export interface LootNotice {
  item: Equipment;
  outcome: StoreOutcome;
  /** Coin recebida quando vendido na hora. */
  price: bigint;
}
type StoreOutcome = "stored" | "autoSold" | "discarded";

/** Resultado da última luta de chefe (em memória até o jogador fechar a tela — ADR-027). */
export interface BossResult {
  bossId: string;
  bossName: string;
  won: boolean;
  reason: "victory" | "defeat" | "timeout";
  durationMs: number;
  /** A vitória que concedeu o bônus de primeira vez. */
  firstClear: boolean;
  rewards: RewardBundle | null;
  /** Estado final de cada herói da equipe (para o resumo). */
  team: { heroId: string; name: string; hp: number; maxHp: number; fell: boolean }[];
  at: number;
}

export interface GameEvents {
  /** Eventos de batalha para o renderer (§66). */
  onBattleEvents?: (events: BattleEvent[]) => void;
  onReward?: (bundle: RewardBundle) => void;
  /** Cada drop de equipamento e o que aconteceu com ele (guardado / vendido na hora / descartado). */
  onLoot?: (drops: LootNotice[]) => void;
  onStateChanged?: (state: GameState) => void;
  /** O Bot agiu (poção, revive, Hub) — só ONLINE; no offline vira o relatório. */
  onBotAction?: (action: BotAction) => void;
  /** Uma luta de chefe terminou (vitória, derrota ou tempo esgotado). */
  onBossResult?: (result: BossResult) => void;
}

/** O que o Bot fez (para o toast/feedback da UI). */
export type BotAction =
  | { kind: "potion"; itemId: string; name: string; healed: number }
  | { kind: "revive"; itemId: string; name: string; hp: number }
  | { kind: "hub_enter" }
  | { kind: "hub_return" };

/** Passo máximo do tempo simulado em batalha (igual ao `MAX_STEP_MS` do loop online). */
const SIM_STEP_MS = 250;

export class GameState {
  private state: SaveData;
  private readonly deps: GameStateDeps;
  private readonly rngHub: RngHub;
  private readonly listeners: GameEvents;
  private battle: BattleState | null = null;
  private battleSequence = 0;
  /** Andar da batalha em curso — selecionar andar não altera uma luta já iniciada. */
  private battleFloor: number | null = null;
  private equipmentIndex = 0;
  private dirty = false;
  /** Relógio VIRTUAL da simulação offline (`null` = usa o relógio real injetado). */
  private simNow: number | null = null;
  /** Relatório em construção durante a simulação offline. */
  private simReport: OfflineReport | null = null;
  /** Relatório pronto, à espera de o jogador fechar a tela "Bem-vindo de volta". */
  private pendingReport: OfflineReport | null = null;
  /** Bot: poções bebidas na luta atual e quando foi a última (tempo de batalha). */
  private revivesThisBattle = 0;
  private potionsThisBattle = 0;
  private lastPotionAtMs = Number.NEGATIVE_INFINITY;
  /** Último resultado de chefe, até o jogador fechar a tela de resultado. */
  private pendingBossResult: BossResult | null = null;

  /** Livro-caixa da sessão (ADR-031): alimenta XP/h, Coin/h e Custo/h do painel de dados. */
  readonly ledger = new HuntLedger();

  constructor(initial: SaveData, deps: GameStateDeps, listeners: GameEvents = {}) {
    this.state = initial;
    this.deps = deps;
    this.rngHub = new RngHub(deps.masterSeed);
    this.listeners = listeners;
    this.ledger.start(this.clock());
  }

  // -------------------------------------------------------------------------
  // Ciclo de vida
  // -------------------------------------------------------------------------

  /**
   * Cria um save novo: 1 Rei + o herói ESCOLHIDO (§10 — "recebe apenas
   * aquele"; os outros 3 permanecem indisponíveis no códice, obtíveis
   * depois pelo sistema geral de aquisição).
   *
   * `starterIdentityId` é o id da identidade em `@tia/config` heroes.ts
   * (ex.: "hero_aldric") — a escolha do jogador na criação. Quem entra na
   * equipe é outra conversa (§19): nenhum herói é colocado em slot sem o
   * jogador mandar.
   *
   * `clock` é o relógio VIVO do dono do estado. O padrão congela em
   * `params.now` (o que torna os testes determinísticos); o app passa o
   * relógio do navegador — sem isso, `tickSearch` compararia o tempo
   * contra ele mesmo e a busca nunca terminaria.
   */
  static createNew(
    params: {
      accountId: AccountId;
      nickname: string;
      skinId: string;
      /** Id da identidade escolhida (P-002) — `HEROES[].id`. */
      starterIdentityId: string;
      now: number;
      masterSeed: number;
    },
    overrides: { now?: () => number; persistence?: PersistenceService; listeners?: GameEvents } = {},
  ): GameState {
    const king = createKing({ accountId: params.accountId, nickname: params.nickname, skinId: params.skinId, now: params.now });
    const wallet = createWallet(params.accountId, 0n, 0n);
    const team = createTeam(params.accountId);
    const inventory = createInventory(params.accountId);

    // §10 — o jogador escolhe 1 dos 4 e RECEBE APENAS AQUELE. As
    // identidades (nome, raridade) vêm do roster P-002 (`@tia/config`
    // heroes.ts); o códice (heróis bloqueados) é derivado, não salvo.
    const identity = heroIdentityById[params.starterIdentityId];
    if (!identity) {
      throw new Error(`Identidade de herói desconhecida: ${params.starterIdentityId}`);
    }
    const heroes = [
      createHero({
        accountId: params.accountId,
        classId: identity.classId as Hero["classId"],
        name: identity.name,
        rarity: identity.rarity,
        now: params.now,
        index: 0,
        origin: "starter",
      }),
    ];

    const save: SaveData = {
      schemaVersion: 1,
      configVersion: config.configVersion,
      revision: 1,
      king,
      wallet,
      heroes,
      team,
      inventory,
      tower: { currentFloor: 1, bestFloor: 0 },
      hunt: null,
      offline: createOfflineProgress(params.now),
      bot: createBotSettings(),
      market: { boxesOpened: 0 },
      boss: createBossProgress(),
      lastSavedAt: params.now,
    };

    return new GameState(
      save,
      {
        persistence: overrides.persistence ?? new LocalStoragePersistence(),
        now: overrides.now ?? (() => params.now),
        masterSeed: params.masterSeed,
      },
      overrides.listeners ?? {},
    );
  }

  /**
   * Relógio do jogo. Na simulação offline é o relógio VIRTUAL (avança com o tempo simulado); fora
   * dela, o relógio real injetado. TODA marca de tempo do estado de caça passa por aqui.
   */
  private clock(): number {
    return this.simNow ?? this.deps.now();
  }

  get data(): Readonly<SaveData> {
    return this.state;
  }

  /**
   * @internal Debug Mode (§77/§93): acesso controlado ao estado para as ferramentas de
   * desenvolvimento (`debug.ts`). Nenhuma tela do jogo usa isto; o painel só existe quando
   * `VITE_DEBUG_MODE=true` (ver `apps/game-web/src/debug-flag.ts`).
   */
  debugContext(): DebugContext {
    return {
      save: this.state,
      now: () => this.clock(),
      rng: (key) => this.lootRng(key),
      nextItemIndex: () => this.equipmentIndex++,
      touch: () => this.touch(),
    };
  }

  /** Relógio do jogo agora (para a UI contar recargas e tempo de luta). */
  get nowMs(): number {
    return this.clock();
  }

  get revision(): number {
    return this.state.revision;
  }

  /** Taxas por hora da caçada (XP, Coin, Custo, Lucro) na janela móvel de `config.hud`. */
  ledgerRates(): LedgerRates {
    return this.ledger.rates(this.clock());
  }

  /** Zera a medição de XP/h, Coin/h e Custo/h (botão "Zerar" do painel de dados). */
  resetLedger(): void {
    this.ledger.start(this.clock());
  }

  get activeBattle(): BattleState | null {
    return this.battle;
  }

  get isVip(): boolean {
    return false; // ⛔ P-013 — VIP desligado no MVP (§49)
  }

  /** PRNG do fluxo de combate. Isolado do de loot. */
  private combatRng(key: string): Prng {
    return this.rngHub.for("combat", key);
  }

  private lootRng(key: string): Prng {
    return this.rngHub.for("loot", key);
  }

  // -------------------------------------------------------------------------
  // Time / Rey
  // -------------------------------------------------------------------------

  /**
   * §47 — `lastActiveAt` é tocado aqui, ao entrar no jogo e no heartbeat.
   * Nunca ao sair: um crash perderia a sessão inteira.
   */
  markActive(): void {
    const now = this.clock();
    touchActive(this.state.king, this.state.offline, now);
    this.dirty = true;
  }

  /**
   * Troca a skin do Rei (§5 — cosmético). Lança `SkinLockedError` para
   * skin desconhecida ou bloqueada pelo nível do Rei.
   */
  changeSkin(skinId: string): void {
    changeKingSkin(this.state.king, skinId);
    this.dirty = true;
    this.listeners.onStateChanged?.(this);
  }

  /** Heróis da equipe, na ordem dos slots. */
  get team(): Hero[] {
    return teamHeroes(this.state.team, this.state.heroes);
  }

  get teamSize(): number {
    return activeTeamSize(this.state.team);
  }

  heroById(id: HeroId): Hero | undefined {
    return this.state.heroes.find((h) => h.id === id);
  }

  /** Crescimento do herói: atributos PRÓPRIOS + raridade (ADR-024), não os da classe. */
  private growthOf(hero: Hero): ClassGrowth {
    return heroGrowth(hero);
  }

  /** §19 — o jogador escolhe o herói ativo. */
  selectActiveHero(heroId: HeroId): void {
    setActiveHero(this.state.team, heroId);
    this.touch();
  }

  /** Coloca um herói num slot (§15 — slots são a unidade de progressão). */
  assignHeroToSlot(heroId: HeroId, slot: 0 | 1 | 2): void {
    placeHero(this.state.team, heroId, slot);
    this.touch();
  }

  removeHeroFromSlot(slot: 0 | 1 | 2): void {
    removeHero(this.state.team, slot);
    this.touch();
  }

  /** §15 — slot 2: nível 10 + Coin. Slot 3: nível 25 + Coin. */
  unlockTeamSlot(index: 0 | 1 | 2): bigint {
    const result = unlockSlot(this.state.team, this.state.king, this.state.wallet, index);
    this.touch();
    return result.spent;
  }

  // -------------------------------------------------------------------------
  // Torre
  // -------------------------------------------------------------------------

  get currentFloor(): number {
    return clampFloor(this.state.tower.currentFloor);
  }

  /** Maior andar liberado para o nível atual do Rei (§46). */
  get highestUnlockedFloor(): number {
    return highestUnlockedFloor(this.state.king.level);
  }

  /**
   * Seleciona o andar da caçada (ADR-021). Só vale a partir da PRÓXIMA batalha;
   * exige o nível do Rei da faixa do andar (§46). Lança `TowerLockedError`.
   */
  selectFloor(floor: number): number {
    const target = clampFloor(floor);
    const required = floorDef(target).requiredKingLevel;
    if (this.state.king.level < required) throw new TowerLockedError(required);
    this.state.tower.currentFloor = target;
    this.touch();
    return target;
  }

  floorInfo(floor: number) {
    return describeFloor(floor);
  }

  /** O herói ativo é obrigatório para entrar na Torre (§19). */
  startTower(): BattleState {
    // O Boss é uma atividade à parte: a Torre não o interrompe (ADR-027).
    if (this.activeBossId) throw new Error("Há uma luta de chefe em curso.");
    const activeId = requireActiveHero(this.state.team);
    const hero = this.heroById(activeId);
    if (!hero) throw new Error(`Herói ativo ${activeId} não encontrado no roster.`);

    const floor = this.currentFloor;
    this.battleSequence += 1;
    const seed = hashString(`${this.state.king.accountId}:${floor}:${this.battleSequence}`) >>> 0;
    const heroStats = heroCombatStats(hero, this.state.inventory);

    // §17/§79 — a assinatura recebe UM herói. A equipe inteira não entra.
    const battle = startTowerBattle({
      king: this.state.king,
      hero,
      heroStats,
      heroEffects: heroCombatEffects(hero, this.state.inventory),
      floor,
      seed,
      sequence: this.battleSequence,
      // ADR-020 (⛔ P-019) — HP persiste entre batalhas: a batalha começa
      // com o HP atual do herói, não com o máximo. É isso que faz o andar
      // ter tensão. Recuperação é ato do jogador (restartHunt/restActiveHero).
      heroStartHp: hero.currentHp,
      heroSkills: engineSkillsFor(hero.classId),
      heroSprites: classes.find((c) => c.id === hero.classId)?.assets.sheets as unknown as
        | Record<string, string>
        | undefined,
      // Físico × mágico importa (ADR-021): arcanist/shadowcaller batem em Def. Esp.
      heroBasicAttackType: classes.find((c) => c.id === hero.classId)?.damageType === "magic" ? "magic" : "physical",
    });

    this.battleFloor = floor;
    this.battle = battle;
    this.potionsThisBattle = 0;
    this.revivesThisBattle = 0;
    this.lastPotionAtMs = Number.NEGATIVE_INFINITY;
    this.state.hunt = { kind: "in_battle", battleId: battle.battleId, startedAt: this.clock() };
    // O Bot confere o HP já na largada (o herói pode vir de uma luta que o deixou baixo).
    this.botAssist();
    this.touch();
    return battle;
  }

  /**
   * Avança a batalha em `dtMs` de tempo SIMULADO e resolve o desfecho.
   * Retorna os eventos para o renderer; o renderer não altera nada aqui.
   */
  advanceBattle(dtMs: number): BattleEvent[] {
    if (!this.battle) return [];
    // Bot (ADR-025): poção ANTES de o tempo andar; revive pelo gancho do engine (a luta continua).
    this.botAssist();
    const events = step(this.battle, this.battle.elapsedMs + dtMs, config.combat, { onAlliesDown: (st) => this.botRevive(st) });
    if (!this.simulating) this.listeners.onBattleEvents?.(events);

    if (this.battle.status !== "active") {
      this.settleBattle();
    }
    return events;
  }

  /** Roda a batalha até o fim, sem relógio. Usado por offline e testes. */
  resolveBattleToEnd(maxMs = 600_000): BattleEvent[] {
    const all: BattleEvent[] = [];
    let guard = 0;
    // `advanceBattle` pode concluir a batalha e liberar `this.battle` — o
    // estado final é lido de uma REFERÊNCIA local, nunca do campo, ou o
    // laço seguinte leria `null` depois de uma vitória.
    let current = this.battle;
    while (current && current.status === "active" && guard < 10_000) {
      all.push(...this.advanceBattle(1000));
      current = this.battle;
      guard += 1;
      if (current && current.elapsedMs > maxMs) break;
    }
    return all;
  }

  private settleBattle(): void {
    const battle = this.battle;
    if (!battle) return;
    if (battle.mode === "boss") {
      this.settleBossBattle(battle);
      return;
    }
    const won = battle.status === "finished" && battle.enemies.every((e) => e.isDefeated);

    // ADR-020 — o HP restante VOLTA para o herói nos dois desfechos:
    // vitória mantém o que sobrou (a tensão do próximo combate), derrota
    // zera (herói caído). Sem isto, "HP persistente" seria decorativo.
    const ally = battle.allies[0];
    const hero = ally?.heroId ? this.heroById(ally.heroId) : null;
    if (hero && ally) {
      hero.currentHp = won ? Math.max(0, ally.hp) : 0;
    }

    if (!won) {
      // ⛔ P-019 — a política de derrota: a caça para; recomeçar é ato do
      // jogador (`restartHunt`, que também cura — ADR-020).
      this.state.hunt = { kind: "defeated", at: this.clock() };
      this.battle = null;
      if (this.simReport) this.simReport.defeats += 1;
      if (!this.simulating && this.state.bot.autoReturnFromHub) this.listeners.onBotAction?.({ kind: "hub_enter" });
      this.touch();
      return;
    }

    const floor = this.battleFloor ?? this.currentFloor;
    const bundle = resolveTowerWin({
      floor,
      // A recompensa segue o nível do inimigo ENFRENTADO, não o do andar atual.
      enemyLevel: battle.enemies[0]?.level,
      rng: this.lootRng(`tower:${floor}:${this.battleSequence}`),
      accountId: this.state.king.accountId,
      itemIndexStart: this.equipmentIndex,
      createdAt: this.clock(),
    });
    this.equipmentIndex += bundle.equipment.length;

    if (this.simReport) {
      this.simReport.battlesWon += 1;
      this.simReport.kingXp += bundle.kingXp;
      this.simReport.heroXp += bundle.heroXp;
    }
    const { autoSoldCoins } = this.applyRewards(bundle);
    if (!this.simulating) {
      this.ledger.record(this.clock(), {
        kingXp: Number(bundle.kingXp),
        heroXp: Number(bundle.heroXp),
        coins: Number(bundle.coins) + Number(autoSoldCoins),
      });
    }
    this.state.tower.bestFloor = Math.max(this.state.tower.bestFloor, floor);
    this.state.hunt = null;
    this.battle = null;
    if (!this.simulating) this.listeners.onReward?.(bundle);
    this.touch();
  }

  /**
   * Credita um pacote de recompensa.
   *
   * A ordem importa e é deliberada: Coin e XP primeiro, equipamento depois,
   * fragmentos por último. Um pacote que estoura o limite de inventário não
   * pode impedir a Coin de ser creditada — o jogador não pode perder
   * recompensa por um limite de UI (⛔ P-016 é provisório).
   */
  applyRewards(bundle: RewardBundle): { autoSoldCoins: bigint } {
    this.state.wallet.coins += bundle.coins;
    grantKingXp(this.state.king, bundle.kingXp);

    // §20 — o XP do herói é DIVIDIDO. `heroXp` no pacote é o total.
    const members = this.team;
    if (members.length > 0) {
      const parts = splitTeamXp(Number(bundle.heroXp), members.length);
      members.forEach((hero, i) => grantHeroXp(hero, BigInt(parts[i] ?? 0), this.growthOf(hero)));
    }

    // Mochila cheia (⛔ P-016): `inventory.onFull` decide (padrão: vende na hora).
    // A Coin e o XP já foram creditados — o limite nunca reverte a recompensa.
    const notices: LootNotice[] = [];
    for (const item of bundle.equipment) {
      const r = storeDrop(this.state.inventory, this.state.wallet, this.state.heroes, item);
      notices.push({ item, outcome: r.outcome, price: r.price });
    }
    if (this.simReport) {
      this.simReport.equipmentFound += notices.length;
      this.simReport.equipmentAutoSold += notices.filter((n) => n.outcome === "autoSold").length;
    }
    if (notices.length > 0 && !this.simulating) this.listeners.onLoot?.(notices);

    // O level-up conserva o HP perdido, mas o teto real inclui o equipamento.
    for (const hero of members) {
      hero.currentHp = Math.min(hero.currentHp, heroCombatStats(hero, this.state.inventory).hp);
    }

    // §12 — fragmentos são da CONTA (por classe e raridade), não de um herói: dá para juntar
    // fragmentos de um herói que ainda não se tem. Só Boss/evento/caixa entregam (nunca a Torre comum).
    for (const frag of bundle.fragments) {
      grantFragments(this.state.inventory, frag.classId, frag.rarity ?? "common", frag.amount, this.clock());
    }

    this.dirty = true;
    return { autoSoldCoins: notices.reduce((sum, n) => (n.outcome === "autoSold" ? sum + n.price : sum), 0n) };
  }

  // -------------------------------------------------------------------------
  // Equipamento (ADR-023)
  // -------------------------------------------------------------------------

  /** Equipa um item (substitui o do mesmo slot). Lança `EquipRequirementError` se o herói não tem nível. */
  equip(heroId: HeroId, equipmentId: EquipmentId): { item: Equipment; replaced: Equipment | null } {
    const hero = this.heroById(heroId);
    if (!hero) throw new Error(`Herói não encontrado: ${heroId}`);
    this.assertNotInBattle(hero);
    const result = equipItem(this.state.inventory, hero, equipmentId, this.state.heroes);
    this.touch();
    return result;
  }

  unequip(heroId: HeroId, slot: EquipSlotId): EquipmentId | null {
    const hero = this.heroById(heroId);
    if (!hero) throw new Error(`Herói não encontrado: ${heroId}`);
    this.assertNotInBattle(hero);
    const id = unequipItem(this.state.inventory, hero, slot);
    this.touch();
    return id;
  }

  /** Trocar equipamento no meio da luta mudaria os stats do combatente em curso: só entre as lutas. */
  private assertNotInBattle(hero: Hero): void {
    if (this.battle && this.battle.status === "active" && this.battle.allies.some((a) => a.heroId === hero.id)) {
      throw new Error("Não é possível trocar equipamento durante a luta.");
    }
  }

  /** §39 — vender equipamento por Coin (item equipado não vende). */
  sell(equipmentId: EquipmentId): bigint {
    const result = sellEquipment(this.state.inventory, this.state.wallet, equipmentId, this.state.heroes);
    this.touch();
    return result.price;
  }

  /** Venda em massa pelos ids. Devolve o total de Coin e quantos foram pulados. */
  sellItems(ids: readonly EquipmentId[]): { count: number; total: bigint; skipped: number } {
    const r = sellMany(this.state.inventory, this.state.wallet, ids, this.state.heroes);
    this.touch();
    return { count: r.sold.length, total: r.total, skipped: r.skipped };
  }

  /** Itens que o filtro venderia (para a UI mostrar "vender N itens por X Coin" ANTES de confirmar). */
  previewBulkSale(filter: BulkSaleFilter): Equipment[] {
    return selectForBulkSale(this.state.inventory, this.state.heroes, filter);
  }

  // -------------------------------------------------------------------------
  // Caça e offline
  // -------------------------------------------------------------------------

  /**
   * Recomeça a caçada após derrota (ou de um descanso): cura o herói ativo
   * quando `combat.healOnHuntRestart` está ligado (ADR-020) e entra na
   * Torre. Nunca é chamado pelo loop — é um ato do jogador (⛔ P-019).
   */
  restartHunt(): BattleState {
    this.healActiveIfConfigured();
    return this.startTower();
  }

  /**
   * "Descansar": o herói ativo recupera HP (quando configurado) e a caçada
   * entra em `paused` — o loop automático NÃO retoma sozinho. É a alavanca
   * de "parar para curar" (COMBAT_SYSTEM §7.2); voltar é `beginSearch()` ou
   * `restartHunt()`.
   */
  restActiveHero(): void {
    this.healActiveIfConfigured();
    this.state.hunt = { kind: "paused", at: this.clock(), reason: "rest" };
    this.touch();
  }

  private healActiveIfConfigured(): void {
    const activeId = requireActiveHero(this.state.team);
    const hero = this.heroById(activeId);
    if (!hero) throw new Error(`Herói ativo ${activeId} não encontrado no roster.`);
    if (config.combat.healOnHuntRestart) {
      hero.currentHp = heroCombatStats(hero, this.state.inventory).hp;
    }
  }

  /**
   * Entra no estado "PROCURANDO..." (§27, ADR-007).
   * O timestamp é absoluto e persistido: navegar não pausa (§29).
   */
  beginSearch(): void {
    this.state.hunt = beginSearching(this.combatRng(`search:${this.battleSequence}`), this.clock());
    this.touch();
  }

  /**
   * Verifica se a busca terminou e, se sim, entra na próxima batalha.
   * Retorna a batalha se começou, `null` se ainda está procurando.
   */
  tickSearch(): BattleState | null {
    const hunt = this.state.hunt;
    if (!hunt || hunt.kind !== "searching") return null;
    if (!isSearchingComplete(hunt, this.clock())) return null;
    this.regenDuringSearch(hunt.durationMs);
    return this.startTower();
  }

  /**
   * ADR-021 — regeneração passiva do herói ativo durante PROCURANDO:
   * `regenOnSearchingPctPerSec` × duração × HP máx. Herói caído não regenera
   * (só o descanso/reinício cura — ADR-020).
   */
  private regenDuringSearch(durationMs: number): void {
    const pct = config.combat.regenOnSearchingPctPerSec;
    if (pct <= 0) return;
    const activeId = this.state.team.activeHeroId;
    const hero = activeId ? this.heroById(activeId) : null;
    if (!hero || hero.currentHp <= 0) return;
    const max = heroCombatStats(hero, this.state.inventory).hp;
    hero.currentHp = Math.min(max, hero.currentHp + Math.floor(max * pct * (durationMs / 1000)));
  }

  /** Quanto falta da animação, em ms. */
  searchingRemainingMs(): number {
    const hunt = this.state.hunt;
    if (!hunt || hunt.kind !== "searching") return 0;
    return Math.max(0, hunt.startedAt + hunt.durationMs - this.clock());
  }

  get offlinePreview() {
    return computeOffline(this.state.offline, this.clock(), this.isVip);
  }

  /** True durante a simulação offline (a UI/renderer não recebem eventos passo a passo). */
  get simulating(): boolean {
    return this.simNow !== null;
  }

  /**
   * ADR-026 — o offline é a SIMULAÇÃO do próprio jogo pelo tempo creditado (2 h Free / 8 h VIP,
   * por ausência): batalha → recompensa → procurando → batalha, com o Bot usando poções, revives
   * e o Hub. Mesmo código do online; só o relógio é virtual. Se o herói cai sem revive, recupera
   * no Hub e volta ao MESMO andar (`currentFloor` nunca é tocado).
   */
  claimOffline(): { rawDurationMs: number; creditedDurationMs: number; wasCapped: boolean; capMs: number; plan: "free" | "vip" } {
    if (this.simulating) throw new Error("claimOffline reentrante.");
    const now = this.deps.now();
    const result = computeOffline(this.state.offline, now, this.isVip);
    const hero = this.state.team.activeHeroId ? this.heroById(this.state.team.activeHeroId) : undefined;

    // O Boss NUNCA roda offline (ADR-027): com uma luta de chefe aberta não há simulação.
    if (result.creditedDurationMs >= config.offline.minAwayMs && hero && this.battle?.mode !== "boss") {
      const start = this.state.offline.lastActiveAt;
      const end = start + result.creditedDurationMs;
      const report = emptyReport(result);
      report.floor = this.currentFloor;
      report.kingLevelBefore = this.state.king.level;
      report.heroLevelBefore = hero.level;
      const coinsBefore = this.state.wallet.coins;
      this.simNow = start;
      this.simReport = report;
      try {
        this.runSimulation(start, end, report);
      } finally {
        // O relógio real volta; o que dependia do virtual é deslocado pela diferença (ausência
        // maior que o teto: o relógio virtual parou em `end`, o real está adiante).
        const virtualEnd = this.simNow ?? end;
        this.simNow = null;
        this.simReport = null;
        this.shiftHuntClock(now - virtualEnd);
        report.coins = this.state.wallet.coins - coinsBefore;
        report.kingLevelAfter = this.state.king.level;
        report.heroLevelAfter = this.heroById(hero.id)?.level ?? hero.level;
      }
      this.pendingReport = report;
    }

    commitOffline(this.state.offline, 0, now);
    this.state.king.lastActiveAt = now;
    this.touch();
    return result;
  }

  /** O laço da simulação. Avança `simNow` de `start` até `end` ou até algo exigir o jogador. */
  private runSimulation(start: number, end: number, report: OfflineReport): void {
    let steps = 0;
    const maxSteps = config.offline.maxSimulatedSteps;
    while ((this.simNow ?? end) < end) {
      if (steps++ >= maxSteps) {
        report.stoppedEarly = "safety";
        break;
      }
      if (!this.state.team.activeHeroId || !this.heroById(this.state.team.activeHeroId)) {
        report.stoppedEarly = "no_hero";
        break;
      }
      const now = this.simNow ?? end;
      if (this.battle) {
        const dt = Math.min(SIM_STEP_MS, end - now);
        this.simNow = now + dt;
        this.advanceBattle(dt);
        continue;
      }
      const hunt = this.state.hunt;
      if (!hunt) {
        this.beginSearch();
        continue;
      }
      if (hunt.kind === "searching" || (hunt.kind === "defeated" && this.state.bot.autoReturnFromHub)) {
        const readyAt = hunt.kind === "searching" ? hunt.startedAt + hunt.durationMs : hunt.at + config.bot.hubRecoveryMs;
        if (readyAt > end) {
          this.simNow = end;
          break;
        }
        this.simNow = Math.max(now, readyAt);
        this.advanceIdle(0);
        continue;
      }
      if (hunt.kind === "defeated") {
        report.stoppedEarly = "defeated";
        break;
      }
      if (hunt.kind === "in_battle") {
        // Luta órfã (não é salva): recomeça pelo PROCURANDO.
        this.state.hunt = null;
        continue;
      }
      report.stoppedEarly = "paused";
      break;
    }
    report.simulatedMs = Math.max(0, Math.min(end, this.simNow ?? end) - start);
  }

  /** Move os carimbos do estado de caça para o relógio real depois de a simulação acabar. */
  private shiftHuntClock(deltaMs: number): void {
    const h = this.state.hunt;
    if (!h || deltaMs === 0) return;
    if (h.kind === "searching" || h.kind === "in_battle") h.startedAt += deltaMs;
    else if (h.kind === "defeated" || h.kind === "paused") h.at += deltaMs;
  }

  /** Relatório do último retorno, até o jogador fechar o "Bem-vindo de volta". */
  get offlineReport(): OfflineReport | null {
    return this.pendingReport;
  }

  dismissOfflineReport(): void {
    this.pendingReport = null;
    this.touch();
  }

  // -------------------------------------------------------------------------
  // Loop de caça (um único ponto de entrada para o online e a simulação)
  // -------------------------------------------------------------------------

  /**
   * Avança UM passo do jogo fora de batalha ativa: luta, busca, Hub ou nova busca. É o que o loop
   * do navegador chama a cada frame e o que a simulação offline chama nas viradas de estado.
   */
  advanceIdle(dtMs: number): void {
    if (this.battle) {
      this.advanceBattle(dtMs);
      return;
    }
    const hunt = this.state.hunt;
    if (!hunt) {
      if (this.state.team.activeHeroId) this.beginSearch();
      return;
    }
    switch (hunt.kind) {
      case "searching":
        this.tickSearch();
        return;
      case "defeated":
        this.tickHub();
        return;
      case "in_battle":
        // Sem luta em memória (recarregou a página): recomeça pelo PROCURANDO.
        this.state.hunt = null;
        return;
      default:
        return;
    }
  }

  /** Quanto falta (ms) para sair do Hub; 0 se não está nele ou se o Bot não volta sozinho. */
  hubRemainingMs(): number {
    const hunt = this.state.hunt;
    if (!hunt || hunt.kind !== "defeated" || !this.state.bot.autoReturnFromHub) return 0;
    return Math.max(0, hunt.at + config.bot.hubRecoveryMs - this.clock());
  }

  /**
   * Hub (ADR-025): herói caído sem revive recupera lá; passado `hubRecoveryMs` toda a equipe volta
   * com o HP cheio e a caçada retoma pelo PROCURANDO — no mesmo andar (o andar vem do save).
   */
  tickHub(): boolean {
    const hunt = this.state.hunt;
    if (!hunt || hunt.kind !== "defeated" || !this.state.bot.autoReturnFromHub) return false;
    if (this.clock() < hunt.at + config.bot.hubRecoveryMs) return false;
    for (const hero of this.state.heroes) hero.currentHp = heroCombatStats(hero, this.state.inventory).hp;
    this.state.hunt = null;
    if (this.simReport) this.simReport.hubTrips += 1;
    if (!this.simulating) this.listeners.onBotAction?.({ kind: "hub_return" });
    this.touch();
    return true;
  }

  // -------------------------------------------------------------------------
  // Bot (ADR-025)
  // -------------------------------------------------------------------------

  /** ADR-031 — o item gasto vira CUSTO da caçada, no preço de mercado atual (só online). */
  private noteCost(itemId: string): void {
    if (this.simulating) return;
    const item = shopItemById(itemId);
    if (!item) return;
    this.ledger.record(this.clock(), { cost: Number(itemPrice(item, this.state.king.level)) });
  }

  private noteUse(itemId: string): void {
    this.noteCost(itemId);
    if (this.simReport) this.simReport.itemsUsed[itemId] = (this.simReport.itemsUsed[itemId] ?? 0) + 1;
  }

  /**
   * Auto-poção e auto-revive: rodam ANTES de cada passo da batalha (online e offline).
   * Na Torre cuidam do herói; na Arena de chefes (ADR-027) cuidam da EQUIPE — a poção vai para o
   * aliado mais ferido e o revive para qualquer caído, com os limites de `config.boss.bot`.
   */
  private botAssist(): void {
    const battle = this.battle;
    if (!battle || battle.status !== "active") return;
    const isBoss = battle.mode === "boss";
    if (isBoss && !config.boss.bot.enabled) return;
    const limits = isBoss ? config.boss.bot : config.bot;
    if (isBoss) this.botReviveFallen(battle);

    const opt = this.state.bot.autoPotion;
    if (!opt.enabled) return;
    if (this.potionsThisBattle >= limits.maxPotionsPerBattle) return;
    if (battle.elapsedMs - this.lastPotionAtMs < limits.potionCooldownMs) return;
    const candidates = isBoss ? battle.allies : battle.allies.slice(0, 1);
    let ally: BattleState["allies"][number] | undefined;
    for (const c of candidates) {
      if (c.isDefeated || c.hp <= 0 || c.maxHp <= 0) continue;
      if ((c.hp / c.maxHp) * 100 >= opt.hpBelowPct) continue;
      if (!ally || c.hp / c.maxHp < ally.hp / ally.maxHp) ally = c;
    }
    if (!ally) return;
    const item = pickPotion(this.state.inventory, opt.itemId, ally.maxHp - ally.hp, ally.maxHp);
    if (!item || !spendOne(this.state.inventory, item.id)) return;
    const healed = healCombatant(battle, ally.id, effectAmount(item.effect, ally.maxHp));
    this.potionsThisBattle += 1;
    this.lastPotionAtMs = battle.elapsedMs;
    this.noteUse(item.id);
    if (!this.simulating) this.listeners.onBotAction?.({ kind: "potion", itemId: item.id, name: item.name, healed });
  }

  /** Arena: revive proativo de qualquer aliado caído (a luta é em equipe; não espera todos caírem). */
  private botReviveFallen(battle: BattleState): void {
    for (const ally of battle.allies) {
      if (!ally.isDefeated) continue;
      if (!this.reviveAlly(battle, ally.id, config.boss.bot.maxRevivesPerBattle)) break;
    }
  }

  private reviveAlly(st: BattleState, allyId: string, maxRevives: number): boolean {
    const opt = this.state.bot.autoRevive;
    if (!opt.enabled || this.revivesThisBattle >= maxRevives) return false;
    const ally = st.allies.find((a) => a.id === allyId);
    if (!ally || !ally.isDefeated) return false;
    const item = pickRevive(this.state.inventory, opt.itemId, ally.maxHp);
    if (!item || !spendOne(this.state.inventory, item.id)) return false;
    const hp = effectAmount(item.effect, ally.maxHp);
    if (!reviveCombatant(st, ally.id, hp)) return false;
    this.revivesThisBattle += 1;
    this.noteUse(item.id);
    if (!this.simulating) this.listeners.onBotAction?.({ kind: "revive", itemId: item.id, name: item.name, hp });
    return true;
  }

  /** Gancho do engine: todos caíram e a luta acabaria — o revive traz alguém de volta à MESMA luta. */
  private botRevive(st: BattleState): boolean {
    const isBoss = st.mode === "boss";
    if (isBoss && !config.boss.bot.enabled) return false;
    const ally = st.allies.find((a) => a.isDefeated);
    if (!ally) return false;
    return this.reviveAlly(st, ally.id, isBoss ? config.boss.bot.maxRevivesPerBattle : config.bot.maxRevivesPerBattle);
  }

  /** Altera as opções do Bot (parcial). Valores fora da faixa são corrigidos, nunca lançam. */
  setBot(patch: BotSettingsPatch): BotSettings {
    this.state.bot = patchBotSettings(this.state.bot, patch);
    this.touch();
    return this.state.bot;
  }

  get bot(): Readonly<BotSettings> {
    return this.state.bot;
  }

  // -------------------------------------------------------------------------
  // Boss (ADR-027)
  // -------------------------------------------------------------------------

  /** Disponibilidade de um chefe agora (nível do Rei, recarga/tentativas). */
  bossAvailability(bossId: string): BossAvailability {
    const def = bossById(bossId);
    if (!def) return { state: "disabled", availableAt: null, attemptsLeft: null };
    return bossAvailability(def, recordOf(this.state.boss, bossId), this.state.king.level, this.clock());
  }

  /** Registro salvo do chefe (vitórias, recorde, recarga). */
  bossRecord(bossId: string) {
    return recordOf(this.state.boss, bossId);
  }

  /** O chefe da luta em curso (ou `null`). */
  get activeBossId(): string | null {
    const b = this.battle;
    return b && b.mode === "boss" && b.status === "active" ? (b.bossId ?? null) : null;
  }

  /** Último resultado de chefe, até `dismissBossResult()`. */
  get bossResult(): BossResult | null {
    return this.pendingBossResult;
  }

  dismissBossResult(): void {
    this.pendingBossResult = null;
    this.touch();
  }

  /**
   * Desafia um chefe com a EQUIPE INTEIRA (§24/§80). Substitui a luta da Torre em curso (sem
   * recompensa nem custo de HP) e consome a tentativa AGORA — recarregar a página não a devolve.
   * Lança `BossBlockedError` (nível, recarga, tentativas, equipe).
   */
  startBoss(bossId: string): BattleState {
    if (this.simulating) throw new Error("O Boss não roda na simulação offline.");
    const def = bossById(bossId);
    if (!def) throw new BossBlockedError("unknown", `Chefe desconhecido: ${bossId}`);
    if (this.activeBossId) throw new BossBlockedError("cooldown", "Já existe uma luta de chefe em curso.");
    const members = this.team;
    if (members.length === 0) throw new BossBlockedError("no_hero", "Monte uma equipe antes de desafiar um chefe.");
    if (members.length < config.boss.minTeamSize) {
      throw new BossBlockedError("team_too_small", `Este desafio exige ao menos ${config.boss.minTeamSize} herói(s) na equipe.`);
    }
    const now = this.clock();
    const avail = bossAvailability(def, recordOf(this.state.boss, def.id), this.state.king.level, now);
    if (avail.state === "disabled") throw new BossBlockedError("disabled", `${def.name} está indisponível.`);
    if (avail.state === "locked") throw new BossBlockedError("locked", `Requer nível do Rei ${def.requiredKingLevel}.`);
    if (avail.state === "cooldown") throw new BossBlockedError("cooldown", `${def.name} ainda está se recuperando.`, avail.availableAt);
    if (avail.state === "no_attempts") throw new BossBlockedError("no_attempts", `Sem tentativas para ${def.name} agora.`, avail.availableAt);

    const full = config.boss.startAtFullHp;
    const allies = members.map((hero) => {
      const stats = heroCombatStats(hero, this.state.inventory);
      const cls = classes.find((c) => c.id === hero.classId);
      return {
        hero,
        stats,
        effects: heroCombatEffects(hero, this.state.inventory),
        skills: engineSkillsFor(hero.classId),
        sprites: cls?.assets.sheets as unknown as Record<string, string> | undefined,
        basicAttackType: (cls?.damageType === "magic" ? "magic" : "physical") as "physical" | "magic",
        startHp: full ? stats.hp : hero.currentHp,
      };
    });
    if (allies.every((a) => a.startHp <= 0)) throw new BossBlockedError("heroes_down", "Toda a equipe está caída. Recupere o HP antes de lutar.");

    const record = this.state.boss.records[def.id] ?? (this.state.boss.records[def.id] = emptyBossRecord());
    registerAttemptStart(def, record, now);
    this.state.boss.battlesStarted += 1;
    const sequence = this.state.boss.battlesStarted;
    const seed = hashString(`${this.state.king.accountId}:${def.id}:${sequence}`) >>> 0;
    const battle = startBossBattle({ def, allies, accountId: this.state.king.accountId, seed, sequence });

    this.battle = battle;
    this.potionsThisBattle = 0;
    this.revivesThisBattle = 0;
    this.lastPotionAtMs = Number.NEGATIVE_INFINITY;
    this.pendingBossResult = null;
    this.state.hunt = { kind: "in_battle", battleId: battle.battleId, startedAt: now };
    this.botAssist();
    this.touch();
    return battle;
  }

  /** Desistir da luta de chefe em curso (conta como derrota; a tentativa já foi consumida). */
  forfeitBoss(): void {
    const battle = this.battle;
    if (!battle || battle.mode !== "boss" || battle.status !== "active") return;
    battle.events.push({ tick: battle.tick, elapsedMs: battle.elapsedMs, type: "battle_lost", reason: "defeat" });
    battle.status = "finished";
    battle.endReason = "defeat";
    this.advanceBattle(0);
  }

  private settleBossBattle(battle: BattleState): void {
    const def = bossById(battle.bossId ?? "");
    const reason = battle.endReason ?? (battle.enemies.every((e) => e.isDefeated) ? "victory" : "defeat");
    const won = reason === "victory";
    const now = this.clock();
    let bundle: RewardBundle | null = null;
    let firstClear = false;

    if (def) {
      const record = this.state.boss.records[def.id] ?? (this.state.boss.records[def.id] = emptyBossRecord());
      firstClear = registerResult(def, record, won, now, battle.elapsedMs).firstClear;
      if (won) {
        bundle = rollBossRewards({
          def,
          firstClear,
          rng: this.lootRng(`boss:${def.id}:${this.state.boss.battlesStarted}`),
          accountId: this.state.king.accountId,
          itemIndexStart: this.equipmentIndex,
          createdAt: now,
          bundleId: `boss:${def.id}`,
        });
        this.equipmentIndex += bundle.equipment.length;
      }
    }

    // A Arena não mexe no HP da Torre por padrão (`persistHpAfter: false`).
    if (config.boss.persistHpAfter) {
      for (const ally of battle.allies) {
        const hero = ally.heroId ? this.heroById(ally.heroId) : undefined;
        if (hero) hero.currentHp = Math.max(0, ally.hp);
      }
    }

    const team = battle.allies.map((a) => ({ heroId: String(a.heroId ?? a.id), name: a.name, hp: Math.max(0, a.hp), maxHp: a.maxHp, fell: a.isDefeated }));
    this.battle = null;
    if (bundle) this.applyRewards(bundle);

    // Fim da atividade (ADR-027): a caçada da Torre retoma sozinha (idle, §111) — ou fica pausada.
    const active = this.state.team.activeHeroId ? this.heroById(this.state.team.activeHeroId) : undefined;
    if (!config.boss.resumeTowerAfter) this.state.hunt = { kind: "paused", at: now, reason: "boss" };
    else if (active && active.currentHp <= 0) this.state.hunt = { kind: "defeated", at: now };
    else this.state.hunt = null;

    const result: BossResult = {
      bossId: def?.id ?? battle.bossId ?? "",
      bossName: def?.name ?? "Chefe",
      won,
      reason,
      durationMs: battle.elapsedMs,
      firstClear,
      rewards: bundle,
      team,
      at: now,
    };
    this.pendingBossResult = result;
    if (!this.simulating) this.listeners.onBossResult?.(result);
    this.touch();
  }

  // -------------------------------------------------------------------------
  // Market (ADR-025)
  // -------------------------------------------------------------------------

  /** Compra pagando Coin. Lança `ShopError` (nível, saldo, pilha cheia...) sem alterar nada. */
  buyItem(itemId: string, quantity = 1): PurchaseResult {
    const r = buyShopItem(this.state.inventory, this.state.wallet, this.state.king, itemId, quantity, this.clock());
    this.touch();
    return r;
  }

  /** Abre caixas da mochila. O sorteio usa o contador persistido: recarregar o jogo não repete. */
  openBox(boxId: string, quantity = 1): BoxOpening {
    const base = this.state.market.boxesOpened;
    const opening = openBoxes({
      inv: this.state.inventory,
      heroes: this.state.heroes,
      boxId,
      quantity,
      rngFor: (i) => this.lootRng(`box:${base + i}`),
      now: this.clock(),
    });
    this.state.market.boxesOpened = base + quantity;
    this.touch();
    return opening;
  }

  /** Invoca um herói com fragmentos juntados (§12). */
  summonHero(classId: string, rarity: Rarity): Hero {
    const hero = summonFromFragments({
      inv: this.state.inventory,
      heroes: this.state.heroes,
      classId,
      rarity,
      rng: this.lootRng(`summon:${this.state.market.boxesOpened}:${this.state.heroes.length}`),
      now: this.clock(),
    });
    this.state.market.boxesOpened += 1;
    this.touch();
    return hero;
  }

  /**
   * Uso manual de poção/revive fora do Bot: cura o herói informado (fora de batalha). Em batalha
   * ativa quem bebe é o Bot — o jogador configura o limite, como no resto do idle.
   */
  useConsumable(itemId: string, heroId: HeroId): number {
    const item = consumableById(itemId);
    if (!item) throw new ShopError("unknown_item", `Item desconhecido: ${itemId}`);
    const hero = this.heroById(heroId);
    if (!hero) throw new Error(`Herói ${heroId} não encontrado.`);
    if (this.battle && this.battle.status === "active") throw new ShopError("not_openable", "Em batalha, o Bot usa os itens.");
    const max = heroCombatStats(hero, this.state.inventory).hp;
    const isRevive = item.effect.kind === "revivePct";
    if (isRevive ? hero.currentHp > 0 : hero.currentHp <= 0 || hero.currentHp >= max) {
      throw new ShopError("bad_quantity", isRevive ? "O herói não está caído." : "O herói não precisa de cura.");
    }
    if (!spendOne(this.state.inventory, item.id)) throw new ShopError("none_owned", `Você não tem ${item.name}.`);
    this.noteCost(item.id);
    const before = hero.currentHp;
    hero.currentHp = Math.min(max, before + effectAmount(item.effect, max));
    this.touch();
    return hero.currentHp - before;
  }

  /** Preço atual (nível do Rei) de um item do Market, para a UI. */
  marketPrice(itemId: string): bigint {
    const item = shopItemById(itemId);
    if (!item) throw new ShopError("unknown_item", `Item desconhecido: ${itemId}`);
    return itemPrice(item, this.state.king.level);
  }

  ownedCount(itemId: string): number {
    return stackCount(this.state.inventory, itemId);
  }

  /**
   * Resgata o offline sem derrubar o jogador.
   *
   * Voltar de uma aba em background é um caminho ROTINEIRO, não um evento
   * raro. Se ele lançar, o jogador vê a tela quebrar ao alternar de aba —
   * o que parece um bug de save. A recompensa é o retorno.
   */
  claimOfflineSafe(): ReturnType<GameState["claimOffline"]> | null {
    try {
      return this.claimOffline();
    } catch (error) {
      console.error("[offline] falha ao creditar; a sessão continua:", error);
      // Mesmo na falha, o relógio é marcado: sem isso, o jogador ficaria
      // preso acumulando a mesma janela a cada retorno de aba.
      this.markActive();
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Persistência
  // -------------------------------------------------------------------------

  private touch(): void {
    this.state.revision += 1;
    this.dirty = true;
    // Na simulação offline a UI não deve re-renderizar a cada passo: um único aviso no fim.
    if (!this.simulating) this.listeners.onStateChanged?.(this);
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Grava se houver mudança. Chamado no intervalo entre ticks e no
   * `visibilitychange`, nunca a cada tick — serializar o save inteiro a
   * 10Hz seria desperdício sem ganho.
   */
  async saveIfDirty(): Promise<boolean> {
    if (!this.dirty) return false;
    this.state.lastSavedAt = this.deps.now();
    this.dirty = false;
    await this.deps.persistence.save(this.state.king.accountId, this.state);
    return true;
  }

  async saveNow(): Promise<void> {
    this.state.lastSavedAt = this.deps.now();
    this.dirty = false;
    await this.deps.persistence.save(this.state.king.accountId, this.state);
  }

  /** Substitui o estado por um save vindo do servidor (§86). */
  applyAuthoritative(remote: SaveData): void {
    this.state = remote;
    this.battle = null;
    this.equipmentIndex = remote.inventory.equipment.length;
    this.dirty = false;
    this.listeners.onStateChanged?.(this);
  }

  /** Alias explícito: `save()` é o nome da interface de persistência. */
  async save(): Promise<void> {
    return this.saveNow();
  }

  /** @internal — usado por `hydrate` e testes. */
  static hydrate(save: SaveData, deps: GameStateDeps, listeners: GameEvents = {}): GameState {
    const state = new GameState(save, deps, listeners);
    state.equipmentIndex = save.inventory.equipment.length;
    // O andar salvo pode não existir mais (conteúdo editado): nunca quebra o load.
    save.tower.currentFloor = clampFloor(save.tower.currentFloor);
    // Saves sem as opções novas (ou editados à mão) caem no padrão da config.
    save.bot = normalizeBotSettings(save.bot);
    save.market = { boxesOpened: Math.max(0, Math.floor(save.market?.boxesOpened ?? 0)) };
    save.boss = normalizeBossProgress(save.boss);
    // Recarregar no meio de uma luta não restaura a luta (ela não é salva): a caçada recomeça
    // pelo PROCURANDO, com o HP que o herói tinha. Sem isso o loop ficaria esperando uma luta que não existe.
    if (save.hunt?.kind === "in_battle") save.hunt = null;
    return state;
  }
}

/**
 * Skills ATIVAS do herói, mapeadas para o formato do engine (§56 — as
 * skills disparam sozinhas, por cooldown). A filtragem é por classe:
 * `catalog.activeSkillId` (a skill assinada P-002) e qualquer outra ativa
 * da mesma classe entram na batalha. Passivas/`damageType: "none"` ficam
 * para a Fase 9+ (efeitos de traço/armas).
 */
export function engineSkillsFor(classId: string): EngineSkillDef[] {
  return skills
    .filter((s) => s.kind === "active" && s.classId === classId && s.coefficient !== null)
    .map((s) => ({
      id: s.id,
      targeting: s.targeting === "all_enemies" ? "all_enemies" : s.targeting === "self" ? "self" : "single",
      damageType: s.damageType === "magic" ? "magic" : "physical",
      coefficient: s.coefficient ?? 1,
      hitCount: s.hitCount ?? 1,
      cooldownMs: s.cooldownMs,
      enabled: true,
    }));
}

export { firstAssigned, rollSearchingDuration, enemyLevelForFloor };
