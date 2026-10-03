/**
 * "Próximo passo" para quem acabou de começar. Função pura sobre o estado: só LÊ,
 * nunca age pelo jogador (nada entra/compra sozinho). Edição futura: acrescentar/reordenar
 * regras em `STEPS` — a primeira que se aplica vence.
 */
import type { GameState } from "@tia/game-core";

export type GuideScreen = "king" | "heroes" | "tower" | "team" | "inventory" | "market" | "boss" | "options";

export interface GuideStep {
  id: string;
  text: string;
  screen: GuideScreen;
  /** Rótulo da aba para onde levar o jogador. */
  go: string;
}

interface Rule {
  id: string;
  when: (s: GameState) => boolean;
  text: (s: GameState) => string;
  screen: GuideScreen;
  go: string;
}

const hasPotion = (s: GameState) => s.data.inventory.items.some((i) => i.kind === "consumable" && i.quantity > 0);
const heroEquipped = (s: GameState) => s.team.some((h) => Object.keys(h.equipped).length > 0);
const bossWins = (s: GameState) => Object.values(s.data.boss.records).reduce((n, r) => n + r.wins, 0);

const STEPS: Rule[] = [
  {
    id: "assign",
    when: (s) => s.data.team.activeHeroId === null,
    text: (s) => `Coloque ${s.data.heroes[0]?.name ?? "seu campeão"} num slot da equipe e escolha quem luta.`,
    screen: "team",
    go: "Equipe",
  },
  {
    id: "tower",
    when: (s) => s.data.hunt === null || s.data.hunt.kind === "idle",
    text: () => "Entre na Torre: o herói luta sozinho e você ganha XP, Coin e equipamentos.",
    screen: "tower",
    go: "Torre",
  },
  {
    id: "equip",
    when: (s) => s.data.inventory.equipment.length > 0 && !heroEquipped(s),
    text: () => "Você achou equipamento! Abra o Inventário e equipe no herói.",
    screen: "inventory",
    go: "Inventário",
  },
  {
    id: "potion",
    when: (s) => !hasPotion(s) && s.data.wallet.coins >= 45n && s.data.king.level < 15,
    text: () => "Compre poções no Market: o Bot as usa por você quando a vida do herói cai.",
    screen: "market",
    go: "Market",
  },
  {
    id: "slot2",
    when: (s) => s.data.team.unlockedSlots < 2 && s.data.king.level >= 10,
    text: () => "Rei nível 10: dá para desbloquear o Slot 2 da equipe (custa Coin).",
    screen: "team",
    go: "Equipe",
  },
  {
    id: "boss",
    when: (s) => s.data.king.level >= 10 && bossWins(s) === 0,
    text: () => "Rei nível 10: desafie o primeiro chefe na Arena — ele solta fragmentos de herói.",
    screen: "boss",
    go: "Arena",
  },
];

export function nextStep(state: GameState): GuideStep | null {
  const rule = STEPS.find((r) => r.when(state));
  return rule ? { id: rule.id, text: rule.text(state), screen: rule.screen, go: rule.go } : null;
}
