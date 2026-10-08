/**
 * Inventário e equipamento (FASE 9, ADR-023).
 *
 * Só apresentação: toda regra (requisito de nível, afinidade, preço, filtro de venda em massa,
 * efeitos) mora em `@tia/game-core` e nos dados de `@tia/config`. Nomes, raridades, cores,
 * slots e ícones vêm do catálogo editável (`config.equipment`) — editar o catálogo pelo painel
 * muda esta tela sem tocar nela.
 */

import { useMemo, useState } from "react";
import { ActionButton, Panel, StatPill } from "@tia/ui";
import { RARITY_ORDER, config, type EquipSlotId, type Rarity, type StatId } from "@tia/config";
import {
  GameState,
  bagItems,
  compareItems,
  equipmentPower,
  equipmentStats,
  featureById,
  heroCombatStats,
  isOrphan,
  itemEffects,
  itemName,
  meetsRequirement,
  requiredHeroLevel,
  sellPriceOf,
  templateById,
  traitForWeaponType,
  traitById,
  equippedItems,
  type LootNotice,
} from "@tia/game-core";
import type { Equipment, Hero } from "@tia/contracts";
import { assetUrl } from "./render/assets.js";
import { formatCompact, formatInt } from "./format.js";

export const STAT_LABEL: Record<StatId, string> = {
  hp: "Vida",
  attack: "Ataque",
  specialAttack: "Atq. Esp.",
  defense: "Defesa",
  specialDefense: "Def. Esp.",
  critChance: "Crítico",
  attackSpeed: "Vel. de ataque",
  speed: "Velocidade",
};

const FRACTION_STATS: StatId[] = ["critChance", "attackSpeed"];

/** 0,0123 → "1,2%"; 1234 → "1.234"; 12345 → "12,3 mil". */
export function formatStat(stat: StatId, value: number, signed = false): string {
  const sign = signed && value > 0 ? "+" : "";
  if (FRACTION_STATS.includes(stat)) return `${sign}${(value * 100).toFixed(1).replace(".", ",")}%`;
  if (stat === "speed") return `${sign}${value.toFixed(1).replace(".", ",")}`;
  return `${sign}${formatCompact(value)}`;
}

const rarityLabel = (r: Rarity) => config.equipment.rarity[r].label;
const slotName = (s: EquipSlotId) => config.equipment.slots.find((x) => x.id === s)?.name ?? s;

type SortKey = "rarityDesc" | "powerDesc" | "qualityDesc" | "levelDesc";
const SORTS: { id: SortKey; label: string }[] = [
  { id: "rarityDesc", label: "Raridade" },
  { id: "powerDesc", label: "Poder" },
  { id: "qualityDesc", label: "Nota" },
  { id: "levelDesc", label: "Nível" },
];

function sortItems(items: Equipment[], key: SortKey): Equipment[] {
  const rarityIdx = (e: Equipment) => RARITY_ORDER.indexOf(e.rarity);
  const by: Record<SortKey, (a: Equipment, b: Equipment) => number> = {
    rarityDesc: (a, b) => rarityIdx(b) - rarityIdx(a) || b.quality - a.quality,
    powerDesc: (a, b) => equipmentPower(b) - equipmentPower(a),
    qualityDesc: (a, b) => b.quality - a.quality,
    levelDesc: (a, b) => b.level - a.level || rarityIdx(b) - rarityIdx(a),
  };
  return [...items].sort(by[key]);
}

function ItemIcon({ item }: { item: Equipment }) {
  const template = templateById(item.itemTypeId);
  const url = template ? assetUrl(template.iconAssetId) : null;
  const color = config.equipment.rarity[item.rarity].color;
  return (
    <span className="tia-itemicon" style={{ borderColor: color }}>
      {url && <img src={url} alt="" />}
    </span>
  );
}

/** Linhas do item: "Ataque 1.234 (×1,72)". */
function ItemLines({ item }: { item: Equipment }) {
  const stats = equipmentStats(item);
  const lines = Object.entries(item.xValues) as [StatId, number][];
  return (
    <ul className="tia-itemlines">
      {lines.map(([stat, x]) => (
        <li key={stat}>
          <span>{STAT_LABEL[stat]}</span>
          <strong>{formatStat(stat, stats[stat], true)}</strong>
          <span className="tia-muted">×{x.toFixed(2).replace(".", ",")}</span>
        </li>
      ))}
    </ul>
  );
}

function ItemEffectsText({ item }: { item: Equipment }) {
  const trait = item.slot === "weapon" ? (traitById(item.traitId) ?? traitForWeaponType(item.weaponType)) : undefined;
  const feature = featureById(item.featureId);
  if (!trait && !feature) return null;
  return (
    <div className="tia-itemfx">
      {trait && (
        <p>
          <strong>{trait.name}</strong> — {trait.description}
          {trait.tip && <span className="tia-muted"> ({trait.tip})</span>}
        </p>
      )}
      {feature && (
        <p>
          <strong className={`tia-rarity tia-rarity--${item.rarity}`}>★ {feature.name}</strong> — {feature.description}
        </p>
      )}
    </div>
  );
}

function ItemHeader({ item }: { item: Equipment }) {
  return (
    <div className="tia-itemhead">
      <ItemIcon item={item} />
      <div className="tia-itemhead__text">
        <strong className={`tia-rarity tia-rarity--${item.rarity}`}>{itemName(item)}</strong>
        <span className="tia-muted">
          {rarityLabel(item.rarity)} · {slotName(item.slot)} · Nv {formatInt(item.level)} · Nota {item.grade} (
          {item.quality.toFixed(0)})
        </span>
      </div>
    </div>
  );
}

function Delta({ item, current }: { item: Equipment; current: Equipment | null }) {
  const diff = compareItems(item, current);
  const rows = (Object.entries(diff) as [StatId, number][]).filter(([, v]) => v !== 0);
  if (rows.length === 0) return null;
  return (
    <p className="tia-delta" aria-label="Comparação com o item equipado">
      {rows.map(([stat, v]) => (
        <span key={stat} className={v > 0 ? "tia-delta--up" : "tia-delta--down"}>
          {v > 0 ? "▲" : "▼"} {STAT_LABEL[stat]} {formatStat(stat, v, true)}
        </span>
      ))}
    </p>
  );
}

export function InventoryScreen({ state, notify }: { state: GameState; notify: (message: string) => void }) {
  const { heroes, inventory } = state.data;
  const activeId = state.data.team.activeHeroId;
  const [heroId, setHeroId] = useState<string | null>(activeId ?? heroes[0]?.id ?? null);
  const hero: Hero | null = heroes.find((h) => h.id === heroId) ?? heroes[0] ?? null;
  const [slot, setSlot] = useState<EquipSlotId | "all">("all");
  const [sort, setSort] = useState<SortKey>(config.inventory.defaultSort);
  const [bulkRarity, setBulkRarity] = useState<Rarity>("common");
  const [bulkQuality, setBulkQuality] = useState<number>(0);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const act = (fn: () => void) => () => {
    try {
      fn();
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };

  const rev = state.revision;
  const bag = useMemo(() => bagItems(inventory, heroes), [rev, inventory, heroes]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useMemo(
    () => sortItems(slot === "all" ? bag : bag.filter((i) => i.slot === slot), sort),
    [bag, slot, sort],
  );
  const bulk = state.previewBulkSale({ maxRarity: bulkRarity, qualityBelow: bulkQuality > 0 ? bulkQuality : undefined });
  const bulkTotal = bulk.reduce((sum, i) => sum + sellPriceOf(i), 0n);
  const equipped = hero ? equippedItems(inventory, hero) : [];
  const bySlot = (s: EquipSlotId) => equipped.find((e) => e.slot === s) ?? null;
  const final = hero ? heroCombatStats(hero, inventory) : null;

  return (
    <>
      <Panel title="Equipamento do herói">
        {heroes.length === 0 || !hero || !final ? (
          <p className="tia-muted">Nenhum herói.</p>
        ) : (
          <>
            <div className="tia-herotabs" role="tablist" aria-label="Herói">
              {heroes.map((h) => (
                <ActionButton
                  key={h.id}
                  label={`${h.name} · Nv ${formatInt(h.level)}`}
                  variant={h.id === hero.id ? "primary" : "secondary"}
                  onClick={() => setHeroId(h.id)}
                />
              ))}
            </div>
            <div className="tia-statgrid">
              {(["hp", "attack", "specialAttack", "defense", "specialDefense", "critChance", "attackSpeed", "speed"] as StatId[]).map((s) => {
                const bonus = final[s] - hero.stats[s];
                return (
                  <StatPill
                    key={s}
                    label={STAT_LABEL[s]}
                    value={`${formatStat(s, final[s])}${bonus > 0 ? ` (${formatStat(s, bonus, true)})` : ""}`}
                    tone={bonus > 0 ? "good" : "neutral"}
                  />
                );
              })}
            </div>
            <div className="tia-paperdoll-wrapper">
              <div className="tia-paperdoll" aria-label="Manequim de Equipamento">
                <img src="/assets/ui/paperdoll_frame.png" alt="" className="tia-paperdoll__arch" />
                <img src="/assets/ui/mannequin_silhouette.png" alt="" className="tia-paperdoll__silhouette" />

                {(["head", "chest", "weapon", "legs", "boots", "amulet"] as EquipSlotId[]).map((slotId) => {
                  const it = bySlot(slotId);
                  const slotLabel = slotId === "head" ? "Elmo" : slotId === "chest" ? "Peitoral" : slotId === "weapon" ? "Arma" : slotId === "legs" ? "Calça" : slotId === "boots" ? "Bota" : "Colar";
                  return (
                    <div
                      key={slotId}
                      className={`tia-paperdoll__slot tia-paperdoll__slot--${slotId}${it ? " tia-paperdoll__slot--filled" : ""}`}
                      title={it ? `${itemName(it)} (${slotLabel})` : `Slot de ${slotLabel} (vazio)`}
                    >
                      {it ? (
                        <ItemIcon item={it} />
                      ) : (
                        <span className="tia-paperdoll__slot-empty-label">{slotLabel}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="tia-slotgrid">
                {config.equipment.slots.map((def) => {
                  const item = bySlot(def.id);
                  return (
                    <div key={def.id} className={`tia-eqslot${item ? "" : " tia-eqslot--empty"}`}>
                      <span className="tia-eqslot__name">{def.name}</span>
                      {item ? (
                        <>
                          <ItemHeader item={item} />
                          <ItemLines item={item} />
                          <ItemEffectsText item={item} />
                          <ActionButton
                            label="Remover"
                            variant="secondary"
                            disabled={state.activeBattle?.allies.some((a) => a.heroId === hero.id) === true}
                            hint="Troca de equipamento só entre as lutas"
                            onClick={act(() => state.unequip(hero.id, def.id))}
                          />
                        </>
                      ) : (
                        <span className="tia-muted">vazio</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {state.activeBattle?.allies.some((a) => a.heroId === hero.id) && (
              <p className="tia-note">Este herói está lutando: o equipamento só pode ser trocado entre as lutas.</p>
            )}
          </>
        )}
      </Panel>

      <Panel title={`Mochila (${bag.length}/${config.inventory.equipmentMaxItems})`}>
        {bag.length >= config.inventory.equipmentMaxItems && (
          <p className="tia-note tia-note--bad">
            Mochila cheia — {config.inventory.onFull === "autoSell" ? "novos drops são vendidos na hora" : "novos drops são descartados"}. Venda ou equipe
            itens para abrir espaço.
          </p>
        )}
        <div className="tia-filters">
          <label>
            Slot{" "}
            <select value={slot} onChange={(e) => setSlot(e.target.value as EquipSlotId | "all")}>
              <option value="all">Todos</option>
              {config.equipment.slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ordenar{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {shown.length === 0 ? (
          <p className="tia-muted">
            Nenhum equipamento{slot !== "all" ? " neste slot" : ""}. {(config.loot.equipmentChance * 100).toFixed(0)}% dos inimigos deixam drop.
          </p>
        ) : (
          <ul className="tia-items">
            {shown.slice(0, 100).map((item) => {
              const current = bySlot(item.slot);
              const ok = hero ? meetsRequirement(hero, item) : false;
              const orphan = isOrphan(item);
              return (
                <li key={item.id} className="tia-item tia-item--card">
                  <ItemHeader item={item} />
                  <ItemLines item={item} />
                  <ItemEffectsText item={item} />
                  {hero && !orphan && <Delta item={item} current={current} />}
                  <div className="tia-item__actions">
                    <ActionButton
                      label={ok ? "Equipar" : `Requer Nv ${formatInt(requiredHeroLevel(item))}`}
                      disabled={!hero || !ok || orphan || !!item.lockedByListingId}
                      hint={hero ? `Equipar em ${hero.name}${current ? " (substitui o atual)" : ""}` : undefined}
                      onClick={act(() => hero && state.equip(hero.id, item.id))}
                    />
                    <ActionButton
                      label={`Vender (${formatCompact(Number(sellPriceOf(item)))} Coin)`}
                      variant="secondary"
                      disabled={!!item.lockedByListingId}
                      onClick={act(() => state.sell(item.id))}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {shown.length > 100 && <p className="tia-muted">Mostrando 100 de {shown.length}. Use os filtros.</p>}
      </Panel>

      <Panel title="Venda em massa">
        <p className="tia-note">
          Vende da mochila (nunca o que está equipado) tudo até a raridade escolhida e com Nota abaixo do limite. Confira o total antes de confirmar.
        </p>
        <div className="tia-filters">
          <label>
            Até a raridade{" "}
            <select
              value={bulkRarity}
              onChange={(e) => {
                setBulkRarity(e.target.value as Rarity);
                setConfirmBulk(false);
              }}
            >
              {RARITY_ORDER.map((r) => (
                <option key={r} value={r}>
                  {rarityLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nota abaixo de{" "}
            <input
              type="number"
              min={0}
              max={100}
              value={bulkQuality}
              onChange={(e) => {
                setBulkQuality(Math.max(0, Math.min(100, Number(e.target.value) || 0)));
                setConfirmBulk(false);
              }}
            />
            <span className="tia-muted"> (0 = qualquer nota)</span>
          </label>
        </div>
        <p>
          {bulk.length === 0 ? "Nenhum item corresponde ao filtro." : `${formatInt(bulk.length)} itens por ${formatInt(bulkTotal)} Coin.`}
        </p>
        {confirmBulk ? (
          <div className="tia-item__actions">
            <ActionButton
              label={`Confirmar: vender ${bulk.length}`}
              variant="danger"
              onClick={act(() => {
                const r = state.sellItems(bulk.map((i) => i.id));
                notify(`Vendidos ${r.count} itens por ${formatInt(r.total)} Coin.`);
                setConfirmBulk(false);
              })}
            />
            <ActionButton label="Cancelar" variant="secondary" onClick={() => setConfirmBulk(false)} />
          </div>
        ) : (
          <ActionButton label="Vender em massa" variant="secondary" disabled={bulk.length === 0} onClick={() => setConfirmBulk(true)} />
        )}
      </Panel>
    </>
  );
}

/** Banner de drops recentes (alimentado por `GameEvents.onLoot`). */
export function LootToasts({ notices }: { notices: { id: number; notice: LootNotice }[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="tia-toasts" role="status" aria-live="polite">
      {notices.map(({ id, notice }) => {
        const { item, outcome, price } = notice;
        const what =
          outcome === "stored"
            ? "guardado na mochila"
            : outcome === "autoSold"
              ? `mochila cheia — vendido por ${formatInt(price)} Coin`
              : "mochila cheia — descartado";
        return (
          <div key={id} className="tia-toast" style={{ borderColor: config.equipment.rarity[item.rarity].color }}>
            <ItemIcon item={item} />
            <span>
              <strong className={`tia-rarity tia-rarity--${item.rarity}`}>
                {rarityLabel(item.rarity)} · {itemName(item)}
              </strong>{" "}
              (Nota {item.grade}) — {what}
            </span>
          </div>
        );
      })}
    </div>
  );
}
