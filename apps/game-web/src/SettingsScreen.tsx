import { useEffect, useRef, useState } from "react";
import { ActionButton, Panel } from "@tia/ui";
import { config } from "@tia/config";
import type { GameState } from "@tia/game-core";
import { GAME_VERSION } from "./version.js";
import { getSettings, subscribeSettings, updateSettings, type Settings } from "./settings.js";
import { playSfx } from "./render/sfx.js";
import {
  downloadSave,
  hasBackup,
  importSaveText,
  pageActions,
  resetProgress,
  restoreBackup,
  validateSaveText,
} from "./saveTools.js";

const NIKA_URL = "https://nikastudio.itch.io/fantasy-dungeon-top-down-pixel-rpg-asset-pack-unity-6-urp";

/** Passos do "Como jogar". Texto editável aqui — nada de regra mora nele. */
export const HOW_TO_PLAY: readonly string[] = [
  "Você é o Rei. Quem luta são os seus heróis — você começa com o campeão que escolheu.",
  "Na aba Equipe, coloque o herói num slot. Na aba Torre, toque em “Entrar na Torre”: o combate é automático, 1 contra 1.",
  "Vencer dá XP (do Rei e do herói), Coin e, às vezes, equipamentos. Cada andar da Torre pede um nível mínimo do Rei.",
  "No Inventário, equipe o que for melhor (Nota alta = melhor) e venda o que sobrar por Coin — a venda em massa ajuda.",
  "No Market, compre poções e revives. O Bot (na tela da Torre) usa por você, até com o jogo fechado.",
  "Fechou o jogo? Ao voltar, o tempo fora (até 2 horas) é simulado e você vê um relatório do que ganhou.",
  "No nível 10 do Rei abre a Arena: chefes com a equipe inteira. Só chefes dão fragmentos para recrutar novos heróis.",
  "O progresso é salvo sozinho neste navegador. Para não perder nada, baixe uma cópia do save de vez em quando.",
];

export function SettingsScreen({
  state,
  notify,
  onBeforeReplace,
}: {
  state: GameState | null;
  notify: (text: string) => void;
  /** Para o loop do jogo antes de trocar/apagar o save (senão ele regravaria o antigo ao recarregar). */
  onBeforeReplace: () => void;
}) {
  const [prefs, setPrefs] = useState<Settings>(getSettings());
  const [backup, setBackup] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ name: string; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeSettings(setPrefs), []);
  useEffect(() => {
    void hasBackup().then(setBackup);
  }, []);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    try {
      const text = await file.text();
      validateSaveText(text);
      setPendingImport({ name: file.name, text });
    } catch (e) {
      setPendingImport(null);
      setError(`Esse arquivo não é um save válido do jogo. ${e instanceof Error ? e.message : ""}`.trim());
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const replaceAndReload = async (action: () => Promise<unknown>) => {
    try {
      onBeforeReplace();
      await action();
      pageActions.reload();
    } catch (e) {
      setError(`Não foi possível concluir: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  };

  return (
    <>
      <Panel title="Som">
        <label className="tia-opt">
          <input
            type="checkbox"
            checked={prefs.sfxEnabled}
            onChange={(e) => updateSettings({ sfxEnabled: e.target.checked })}
          />
          <span>Efeitos sonoros ligados</span>
        </label>
        <label className="tia-opt">
          <span>Volume: {Math.round(prefs.sfxVolume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(prefs.sfxVolume * 100)}
            disabled={!prefs.sfxEnabled}
            aria-label="Volume dos efeitos"
            onChange={(e) => updateSettings({ sfxVolume: Number(e.target.value) / 100 })}
          />
        </label>
        <ActionButton label="Testar som" variant="secondary" disabled={!prefs.sfxEnabled} onClick={() => playSfx("audio/sfx/hit_01")} />
        <p className="tia-note">Navegadores só liberam o som depois de você tocar na tela pelo menos uma vez.</p>
      </Panel>

      <Panel title="Seu progresso">
        <p className="tia-note">
          O jogo salva sozinho a cada poucos segundos, neste navegador e neste endereço. Outro navegador (ou outro endereço)
          tem o próprio save — por isso vale baixar uma cópia.
        </p>
        <div className="tia-opt-row">
          {state && (
            <ActionButton
              label="Salvar agora"
              variant="secondary"
              onClick={() => {
                void state.save().then(() => notify("Jogo salvo."));
              }}
            />
          )}
          <ActionButton
            label="Baixar cópia do save"
            variant="secondary"
            onClick={() => {
              void downloadSave(state).then((ok) => notify(ok ? "Cópia do save baixada." : "Ainda não há save para baixar."));
            }}
          />
          <ActionButton label="Carregar save de um arquivo" variant="secondary" onClick={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            aria-label="Arquivo de save"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>

        {pendingImport && (
          <div className="tia-confirm" role="alertdialog" aria-label="Confirmar importação">
            <p>
              Carregar <strong>{pendingImport.name}</strong>? Isso <strong>substitui</strong> o progresso atual. Uma cópia do
              progresso atual fica guardada e pode ser restaurada aqui.
            </p>
            <div className="tia-opt-row">
              <ActionButton label="Sim, carregar" variant="danger" onClick={() => void replaceAndReload(() => importSaveText(pendingImport.text))} />
              <ActionButton label="Cancelar" variant="secondary" onClick={() => setPendingImport(null)} />
            </div>
          </div>
        )}

        {backup && (
          <div className="tia-opt-row">
            <ActionButton
              label="Restaurar a cópia anterior"
              variant="secondary"
              hint="Desfaz a última importação ou o último “apagar progresso”"
              onClick={() => void replaceAndReload(restoreBackup)}
            />
          </div>
        )}

        {state && !confirmReset && (
          <div className="tia-opt-row">
            <ActionButton label="Apagar progresso e recomeçar" variant="danger" onClick={() => setConfirmReset(true)} />
          </div>
        )}
        {confirmReset && (
          <div className="tia-confirm" role="alertdialog" aria-label="Confirmar apagar progresso">
            <p>
              Tem certeza? O Rei, os heróis, o inventário e tudo o mais serão apagados deste navegador. Fica guardada uma cópia
              de segurança (você pode restaurá-la em seguida).
            </p>
            <div className="tia-opt-row">
              <ActionButton label="Sim, apagar tudo" variant="danger" onClick={() => void replaceAndReload(resetProgress)} />
              <ActionButton label="Cancelar" variant="secondary" onClick={() => setConfirmReset(false)} />
            </div>
          </div>
        )}
        {error && (
          <p className="tia-note--bad" role="alert">
            {error}
          </p>
        )}
      </Panel>

      <Panel title="Como jogar">
        <ol className="tia-howto">
          {HOW_TO_PLAY.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </Panel>

      <Panel title="Sobre e créditos">
        <p className="tia-note">
          Tower Idle Adventure — versão {GAME_VERSION}. Balanceamento v{config.configVersion}. Jogo em construção: números
          podem mudar entre versões (o save é migrado).
        </p>
        <p className="tia-note">
          Arte: <strong>Assets by Nika Studio</strong> —{" "}
          <a href={NIKA_URL} target="_blank" rel="noreferrer">
            Fantasy Dungeon, Top-Down Pixel-Style RPG (itch.io)
          </a>
          . Sons e ícones extras gerados para este projeto. Inspirado no framework OpenRpg (MIT).
        </p>
      </Panel>
    </>
  );
}
