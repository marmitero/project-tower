/**
 * Market (ADR-025): compra de poções, revives e caixas com Coin, abertura de caixas e
 * invocação de heróis por fragmentos.
 *
 * Só apresentação. Catálogo, abas, preços, níveis mínimos e chances vêm de `config.market`
 * (editáveis pelo painel futuro); a regra de compra/abertura mora em `@tia/game-core`.
 */

import { useState } from "react";
import { ActionButton, Panel, StatPill } from "@tia/ui";
import { config, classes, type ShopItemDef } from "@tia/config";
import {
  GameState,
  ShopError,
  effectAmount,
  fragmentSummary,
  heroCombatStats,
  heroNameForClass,
  itemPrice,
  purchaseBlock,
  type BoxOpening,
} from "@tia/game-core";
import { assetUrl } from "./render/assets.js";
import { formatInt } from "./format.js";

const rarityLabel = (r: ShopItemDef["rarity"]) => config.equipment.rarity[r].label;

function describeEffect(item: ShopItemDef, maxHp: number): string | null {
  if (item.kind !== "consumable") return null;
  // Sem herói ativo não há vida máxima para calcular o efeito.
  if (maxHp <= 0 && item.effect.kind !== "healFlat") return item.effect.kind === "revivePct" ? `Revive o herói com ${Math.round(item.effect.pct * 100)}% da vida` : `Cura ${Math.round(item.effect.pct * 100)}% da vida máxima`;
  const amount = effectAmount(item.effect, maxHp);
  if (item.effect.kind === "revivePct") return `Revive com ${formatInt(amount)} de vida (herói ativo)`;
  return `+${formatInt(amount)} de vida (herói ativo)`;
}

export function MarketScreen({ state, notify }: { state: GameState; notify: (text: string) => void }) {
  const tabs = config.market.tabs;
  const [tab, setTab] = useState<string>(tabs[0]?.id ?? "");
  const [last, setLast] = useState<BoxOpening | null>(null);
  const king = state.data.king;
  const coins = state.data.wallet.coins;
  const hero = state.data.heroes.find((h) => h.id === state.data.team.activeHeroId) ?? null;
  const maxHp = hero ? heroCombatStats(hero, state.data.inventory).hp : 0;

  const act = (fn: () => void) => () => {
    try {
      fn();
    } catch (error) {
      if (error instanceof ShopError) notify(error.message);
      else console.warn("[ui]", error);
    }
  };

  const items = config.market.items.filter((i) => i.tab === tab && i.enabled);

  return (
    <>
      <Panel title="Market">
        <p className="tia-note">
          Compre com Coin. Poções e revives são usados pelo Bot (veja a tela da Torre) — online e offline. As caixas são
          caras e exigem um Rei forte: são um SEGUNDO caminho para novos heróis, não o principal.
        </p>
        <StatPill label="Coin" value={formatInt(coins)} tone="warn" />
        <div className="tia-tabs" role="tablist" aria-label="Categorias do Market">
          {tabs.map((t) => (
            <ActionButton key={t.id} label={t.name} variant={tab === t.id ? "primary" : "secondary"} onClick={() => setTab(t.id)} />
          ))}
        </div>
        <ul className="tia-market">
          {items.map((item) => {
            const price = itemPrice(item, king.level);
            const block = purchaseBlock(item, king, state.data.inventory);
            const owned = state.ownedCount(item.id);
            const icon = assetUrl(item.iconId);
            const effect = describeEffect(item, maxHp);
            const canBuy = (qty: number) => !block && coins >= price * BigInt(qty);
            return (
              <li key={item.id} className="tia-market__row">
                <span className="tia-itemicon" style={{ borderColor: config.equipment.rarity[item.rarity].color }}>
                  {icon && <img src={icon} alt="" />}
                </span>
                <span className="tia-market__main">
                  <strong className={`tia-rarity tia-rarity--${item.rarity}`}>{item.name}</strong>
                  <span className="tia-muted">{item.description}</span>
                  {effect && <span className="tia-muted">{effect}</span>}
                  <span className="tia-market__meta">
                    <span>Preço: {formatInt(price)} Coin</span>
                    <span>Você tem: {formatInt(owned)}</span>
                    {block && <span className="tia-note--bad">{block.message}</span>}
                  </span>
                </span>
                <span className="tia-market__buttons">
                  <ActionButton label="Comprar" disabled={!canBuy(1)} onClick={act(() => state.buyItem(item.id, 1))} />
                  <ActionButton label="×10" variant="secondary" disabled={!canBuy(10)} onClick={act(() => state.buyItem(item.id, 10))} />
                  {item.kind === "box" && (
                    <ActionButton
                      label="Abrir"
                      variant="secondary"
                      disabled={owned < 1}
                      onClick={act(() => setLast(state.openBox(item.id, 1)))}
                    />
                  )}
                  {item.kind === "consumable" && hero && (
                    <ActionButton
                      label="Usar"
                      variant="secondary"
                      hint="Usar no herói ativo (fora de batalha)"
                      disabled={owned < 1 || state.activeBattle !== null}
                      onClick={act(() => {
                        const healed = state.useConsumable(item.id, hero.id);
                        notify(`${item.name}: +${formatInt(healed)} de vida.`);
                      })}
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      {last && (
        <Panel title={`Resultado — ${last.box.name}`}>
          <ul className="tia-market__results">
            {last.results.map((r, i) =>
              r.kind === "hero" ? (
                <li key={i}>
                  <strong className={`tia-rarity tia-rarity--${r.hero.rarity}`}>{rarityLabel(r.hero.rarity)}</strong> — herói completo:{" "}
                  <strong>{r.hero.name}</strong>! Veja na tela Heróis.
                </li>
              ) : (
                <li key={i}>
                  {formatInt(r.amount)}× fragmento de {heroNameForClass(r.classId)} ({rarityLabel(r.rarity)})
                </li>
              ),
            )}
          </ul>
          <ActionButton label="Fechar" variant="secondary" onClick={() => setLast(null)} />
        </Panel>
      )}

      <FragmentsPanel state={state} notify={notify} />
    </>
  );
}

function FragmentsPanel({ state, notify }: { state: GameState; notify: (text: string) => void }) {
  const list = fragmentSummary(state.data.inventory);
  return (
    <Panel title="Fragmentos de heróis">
      {list.length === 0 ? (
        <p className="tia-note">Você ainda não tem fragmentos. Eles vêm de caixas, chefes e eventos — nunca de inimigos comuns da Torre.</p>
      ) : (
        <ul className="tia-market">
          {list.map((f) => {
            const cls = classes.find((c) => c.id === f.classId);
            const ready = f.count >= f.required;
            return (
              <li key={`${f.classId}:${f.rarity}`} className="tia-market__row">
                <span className="tia-market__main">
                  <strong className={`tia-rarity tia-rarity--${f.rarity}`}>
                    {heroNameForClass(f.classId)} · {cls?.name ?? f.classId} · {rarityLabel(f.rarity)}
                  </strong>
                  <span className="tia-muted">
                    {formatInt(f.count)} / {formatInt(f.required)} fragmentos
                  </span>
                </span>
                <span className="tia-market__buttons">
                  <ActionButton
                    label="Invocar"
                    disabled={!ready}
                    onClick={() => {
                      try {
                        const hero = state.summonHero(f.classId, f.rarity);
                        notify(`${hero.name} (${rarityLabel(hero.rarity)}) se juntou ao seu Reino!`);
                      } catch (error) {
                        if (error instanceof ShopError) notify(error.message);
                      }
                    }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
