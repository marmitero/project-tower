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
  Hero,
  RewardBundle,
  SaveData,
} from "@tia/contracts";
import type { AccountId, HeroId } from "@tia/contracts";
import { heroById as heroIdentityById, classes, config, skills, type ClassGrowth } from "@tia/config";
import { RngHub, hashString, step, type Prng, type SkillDef as EngineSkillDef } from "@tia/engine";
import { createKing, createTeam, createWallet, createHero, activeTeamSize, changeKingSkin } from "./creation.js";
import { createInventory } from "./inventory.js";
import { createOfflineProgress, beginSearching, isSearchingComplete, computeOffline, commitOffline, touchActive, rollSearchingDuration } from "./hunt.js";
import { requireActiveHero, placeHero, setActiveHero, unlockSlot, firstAssigned, removeHero } from "./team.js";
import { teamHeroes } from "./team.js";
import { addEquipment, heroCombatStats, sellEquipment } from "./inventory.js";
import { grantHeroXp, grantKingXp, splitTeamXp } from "./progression.js";
import { startTowerBattle, resolveTowerWin, describeFloor, enemyLevelForFloor } from "./tower.js";
import type { PersistenceService } from "./persistence/types.js";
import { LocalStoragePersistence } from "./persistence/local.js";

export interface GameStateDeps {
  persistence: PersistenceService;
  /** Relógio injetado. Nunca `Date.now()` espalhado pelo código. */
  now: () => number;
  /** Semente mestra. Persistida, para que o save seja auditável. */
  masterSeed: number;
}

export interface GameEvents {
  /** Eventos de batalha para o renderer (§66). */
  onBattleEvents?: (events: BattleEvent[]) => void;
  onReward?: (bundle: RewardBundle) => void;
  onStateChanged?: (state: GameState) => void;
}

export class GameState {
  private state: SaveData;
  private readonly deps: GameStateDeps;
  private readonly rngHub: RngHub;
  private readonly listeners: GameEvents;
  private battle: BattleState | null = null;
  private battleSequence = 0;
  private equipmentIndex = 0;
  private dirty = false;

  constructor(initial: SaveData, deps: GameStateDeps, listeners: GameEvents = {}) {
    this.state = initial;
    this.deps = deps;
    this.rngHub = new RngHub(deps.masterSeed);
    this.listeners = listeners;
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

  get data(): Readonly<SaveData> {
    return this.state;
  }

  get revision(): number {
    return this.state.revision;
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
    const now = this.deps.now();
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

  private growthOf(hero: Hero): ClassGrowth {
    const cls = classes.find((c) => c.id === hero.classId);
    if (!cls) throw new Error(`Classe desconhecida: ${hero.classId}`);
    return cls.growth;
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
    return this.state.tower.currentFloor;
  }

  floorInfo(floor: number) {
    return describeFloor(floor);
  }

  /** O herói ativo é obrigatório para entrar na Torre (§19). */
  startTower(): BattleState {
    const activeId = requireActiveHero(this.state.team);
    const hero = this.heroById(activeId);
    if (!hero) throw new Error(`Herói ativo ${activeId} não encontrado no roster.`);

    const floor = this.state.tower.currentFloor;
    this.battleSequence += 1;
    const seed = hashString(`${this.state.king.accountId}:${floor}:${this.battleSequence}`) >>> 0;
    const heroStats = heroCombatStats(hero, this.state.inventory);

    // §17/§79 — a assinatura recebe UM herói. A equipe inteira não entra.
    const battle = startTowerBattle({
      king: this.state.king,
      hero,
      heroStats,
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
    });

    this.battle = battle;
    this.state.hunt = { kind: "in_battle", battleId: battle.battleId, startedAt: this.deps.now() };
    this.touch();
    return battle;
  }

  /**
   * Avança a batalha em `dtMs` de tempo SIMULADO e resolve o desfecho.
   * Retorna os eventos para o renderer; o renderer não altera nada aqui.
   */
  advanceBattle(dtMs: number): BattleEvent[] {
    if (!this.battle) return [];
    const events = step(this.battle, this.battle.elapsedMs + dtMs, config.combat);
    this.listeners.onBattleEvents?.(events);

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
      this.state.hunt = { kind: "defeated", at: this.deps.now() };
      this.battle = null;
      this.touch();
      return;
    }

    const floor = this.state.tower.currentFloor;
    const bundle = resolveTowerWin({
      floor,
      rng: this.lootRng(`tower:${floor}:${this.battleSequence}`),
      accountId: this.state.king.accountId,
      itemIndexStart: this.equipmentIndex,
      createdAt: this.deps.now(),
    });
    this.equipmentIndex += bundle.equipment.length;

    this.applyRewards(bundle);
    this.state.tower.bestFloor = Math.max(this.state.tower.bestFloor, floor);
    this.state.hunt = null;
    this.battle = null;
    this.listeners.onReward?.(bundle);
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
  applyRewards(bundle: RewardBundle): void {
    this.state.wallet.coins += bundle.coins;
    grantKingXp(this.state.king, bundle.kingXp);

    // §20 — o XP do herói é DIVIDIDO. `heroXp` no pacote é o total.
    const members = this.team;
    if (members.length > 0) {
      const parts = splitTeamXp(Number(bundle.heroXp), members.length);
      members.forEach((hero, i) => grantHeroXp(hero, BigInt(parts[i] ?? 0), this.growthOf(hero)));
    }

    for (const item of bundle.equipment) {
      try {
        addEquipment(this.state.inventory, item);
      } catch {
        // Limite de inventário: o item é descartado, mas a Coin e o XP
        // continuam. Emitir o item como "perdido" é preferível a reverter
        // a recompensa inteira.
      }
    }

    for (const frag of bundle.fragments) {
      const hero = this.state.heroes.find((h) => h.classId === frag.classId);
      if (!hero) continue;
      const key = frag.classId;
      hero.fragments[key] = (hero.fragments[key] ?? 0) + frag.amount;
    }

    this.dirty = true;
  }

  /** §39 — vender equipamento por Coin. */
  sell(equipmentId: Parameters<typeof sellEquipment>[2]): bigint {
    const result = sellEquipment(this.state.inventory, this.state.wallet, equipmentId);
    this.touch();
    return result.price;
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
    this.state.hunt = { kind: "paused", at: this.deps.now(), reason: "rest" };
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
    this.state.hunt = beginSearching(this.combatRng(`search:${this.battleSequence}`), this.deps.now());
    this.touch();
  }

  /**
   * Verifica se a busca terminou e, se sim, entra na próxima batalha.
   * Retorna a batalha se começou, `null` se ainda está procurando.
   */
  tickSearch(): BattleState | null {
    const hunt = this.state.hunt;
    if (!hunt || hunt.kind !== "searching") return null;
    if (!isSearchingComplete(hunt, this.deps.now())) return null;
    return this.startTower();
  }

  /** Quanto falta da animação, em ms. */
  searchingRemainingMs(): number {
    const hunt = this.state.hunt;
    if (!hunt || hunt.kind !== "searching") return 0;
    return Math.max(0, hunt.startedAt + hunt.durationMs - this.deps.now());
  }

  get offlinePreview() {
    return computeOffline(this.state.offline, this.deps.now(), this.isVip);
  }

  /**
   * §47 — calcula a recompensa offline e a credita.
   * ⛔ P-011 (taxa de conversão) e P-011a (derrota durante offline) não
   * estão definidos; o comportamento aqui é conservador: credita o que o teto
   * permite, sem simular derrotas.
   */
  claimOffline(): { rawDurationMs: number; creditedDurationMs: number; wasCapped: boolean; capMs: number; plan: "free" | "vip" } {
    const now = this.deps.now();
    const result = computeOffline(this.state.offline, now, this.isVip);
    if (result.creditedDurationMs > 0) {
      // ⛔ P-011 provisório: conversão simples, sem taxa de decaimento.
      const cycles = Math.floor(result.creditedDurationMs / 60_000);
      if (cycles > 0) {
        this.applyRewards({
          id: `offline:${now}`,
          kingXp: BigInt(cycles * 20),
          heroXp: BigInt(cycles * 50),
          coins: BigInt(cycles * 15),
          equipment: [],
          fragments: [],
        });
      }
    }
    const total = this.state.offline.accumulatedMs + result.creditedDurationMs;
    commitOffline(this.state.offline, Math.min(total, result.capMs), now);
    this.touch();
    return result;
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
    this.listeners.onStateChanged?.(this);
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
function engineSkillsFor(classId: string): EngineSkillDef[] {
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
