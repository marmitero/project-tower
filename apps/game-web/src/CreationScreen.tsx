/**
 * Tela de criação do Rei (§5 — "nome + skin").
 *
 * §63 — a UI não decide regra: este componente COLETA intenções (digitar
 * nome, escolher skin) e devolve para o chamador, que chama `createGame`.
 * A validação que roda aqui (`validateNickname`) é a MESMA do game-core —
 * não há uma segunda implementação de regra na UI.
 *
 * §62 — visual com a identidade do pack: moldura 9-slice de pedra,
 * pergaminho ornate no cabeçalho, preview das skins em arte do pack.
 * Nada de quadrado colorido no lugar de arte.
 */

import { useMemo, useState } from "react";
import { config } from "@tia/config";
import { validateNickname, NICKNAME_MESSAGES, isSkinUnlocked } from "@tia/game-core";
import { ActionButton } from "@tia/ui";
import { assetUrl } from "./render/assets.js";

export interface CreationResult {
  nickname: string;
  skinId: string;
}

const SKINS = config.account.king.skins.filter((s) => isSkinUnlocked(s, 1));

export function CreationScreen({ onSubmit }: { onSubmit: (result: CreationResult) => void }) {
  const [name, setName] = useState("");
  const [skinId, setSkinId] = useState(SKINS[0]!.id);

  const validation = useMemo(() => validateNickname(name), [name]);
  const canSubmit = validation.ok;

  return (
    <div className="tia-creation">
      <form
        className="tia-creation__card tia-frame-9"
        onSubmit={(event) => {
          event.preventDefault();
          if (!validation.ok) return;
          onSubmit({ nickname: validation.value, skinId });
        }}
      >
        <div className="tia-creation__banner" role="presentation" />

        <h1 className="tia-creation__title">Coroe o seu Rei</h1>
        <p className="tia-creation__lead">
          O Rei é você: a conta, o Reino e os seus campeões. Escolha um nome e uma aparência —
          heróis são súditos, e é por eles que você luta (§8).
        </p>

        <label className="tia-creation__label" htmlFor="tia-nickname">
          Nome do Rei
        </label>
        <input
          id="tia-nickname"
          className="tia-creation__input"
          type="text"
          value={name}
          maxLength={config.account.nickname.maxLength}
          autoComplete="off"
          spellCheck={false}
          placeholder="Ex.: Aldric"
          aria-invalid={name.length > 0 && !validation.ok}
          onChange={(event) => setName(event.target.value)}
        />
        <p
          className={`tia-creation__hint ${name.length > 0 && !validation.ok ? "tia-creation__hint--bad" : ""}`}
          role={name.length > 0 && !validation.ok ? "alert" : undefined}
        >
          {name.length === 0
            ? `De ${config.account.nickname.minLength} a ${config.account.nickname.maxLength} caracteres: letras, números, hífen e sublinhado.`
            : validation.ok
              ? "Nome disponível."
              : NICKNAME_MESSAGES[validation.code]}
        </p>

        <fieldset className="tia-creation__skins">
          <legend className="tia-creation__label">Aparência</legend>
          <div className="tia-creation__skin-grid">
            {SKINS.map((skin) => (
              <button
                key={skin.id}
                type="button"
                className={`tia-creation__skin ${skin.id === skinId ? "tia-creation__skin--selected" : ""}`}
                aria-pressed={skin.id === skinId}
                onClick={() => setSkinId(skin.id)}
              >
                <img src={assetUrl(skin.assetId) ?? undefined} alt="" className="tia-creation__skin-art" />
                <span className="tia-creation__skin-name">{skin.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <ActionButton type="submit" variant="primary" disabled={!canSubmit} label="Começar o Reino" />
      </form>
    </div>
  );
}
