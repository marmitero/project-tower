/**
 * "Bem-vindo de volta" (ADR-026): resumo da simulação do tempo fora.
 * Só apresentação — o relatório é montado pelo `GameState` ao simular.
 */

import { ActionButton } from "@tia/ui";
import { shopItemById, type OfflineReport } from "@tia/game-core";
import { formatInt } from "./format.js";

function duration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

const STOP_TEXT: Record<NonNullable<OfflineReport["stoppedEarly"]>, string> = {
  paused: "A caçada estava em pausa (descanso): nada foi simulado depois disso.",
  defeated: "O herói caiu e o Bot estava configurado para NÃO voltar do Hub sozinho — a caçada parou aí.",
  no_hero: "Não havia herói ativo.",
  safety: "A simulação atingiu o limite de segurança e parou.",
};

export function OfflineReportModal({ report, onClose }: { report: OfflineReport; onClose: () => void }) {
  const used = Object.entries(report.itemsUsed);
  return (
    <div className="tia-modal" role="dialog" aria-modal="true" aria-labelledby="tia-offline-title">
      <div className="tia-modal__card">
        <h2 id="tia-offline-title">Bem-vindo de volta!</h2>
        <p className="tia-note">
          Você ficou fora por {duration(report.rawDurationMs)}.{" "}
          {report.wasCapped
            ? `O limite do plano ${report.plan === "vip" ? "VIP" : "Free"} é ${duration(report.capMs)} — esse tempo foi jogado por você.`
            : "Todo esse tempo foi jogado por você."}{" "}
          Andar {report.floor}.
        </p>
        <ul className="tia-modal__list">
          <li>Batalhas vencidas: <strong>{formatInt(report.battlesWon)}</strong></li>
          <li>Coin: <strong>{report.coins >= 0n ? "+" : ""}{formatInt(report.coins)}</strong></li>
          <li>XP do Rei: <strong>+{formatInt(report.kingXp)}</strong> (Nv {formatInt(report.kingLevelBefore)} → {formatInt(report.kingLevelAfter)})</li>
          <li>XP de herói: <strong>+{formatInt(report.heroXp)}</strong> (Nv {formatInt(report.heroLevelBefore)} → {formatInt(report.heroLevelAfter)})</li>
          <li>
            Equipamentos: <strong>{formatInt(report.equipmentFound)}</strong> encontrados
            {report.equipmentAutoSold > 0 && <> ({formatInt(report.equipmentAutoSold)} vendidos por mochila cheia)</>}
          </li>
          {report.defeats > 0 && (
            <li>
              Derrotas: <strong>{formatInt(report.defeats)}</strong> · idas ao Hub: <strong>{formatInt(report.hubTrips)}</strong>
            </li>
          )}
          {used.length > 0 && (
            <li>
              Itens usados pelo Bot:{" "}
              {used.map(([id, n]) => `${shopItemById(id)?.name ?? id} ×${formatInt(n)}`).join(" · ")}
            </li>
          )}
        </ul>
        {report.stoppedEarly && <p className="tia-note tia-note--bad">{STOP_TEXT[report.stoppedEarly]}</p>}
        <ActionButton label="Continuar" onClick={onClose} />
      </div>
    </div>
  );
}
