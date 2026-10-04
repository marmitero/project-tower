/**
 * Tela de criação (§5 — "nome + skin"; §10 — escolha de 1 herói).
 *
 * §63 — a UI não decide regra: este componente COLETA intenções (digitar
 * nome, escolher skin, convocar um herói) e devolve para o chamador, que
 * chama `createGame`. A validação que roda aqui (`validateNickname`) é a
 * MESMA do game-core — não há uma segunda implementação de regra na UI.
 *
 * §62 — visual com a identidade do pack: moldura 9-slice de pedra,
 * pergaminho ornate no cabeçalho, skins e retratos em arte do pack.
 * Nada de quadrado colorido no lugar de arte.
 *
 * Dois passos, uma decisão por tela (§10 — a escolha do herói precisa ter
 * peso; escondê-la junto com o nome a transformaria em formulário).
 */

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { HEROES, CREATION_LAYOUT, LOGIN_ASSETS, classes, config, skillsById, type Rarity } from "@tia/config";
import { validateNickname, NICKNAME_MESSAGES, isSkinUnlocked } from "@tia/game-core";
import { ActionButton } from "@tia/ui";
import { assetUrl } from "./render/assets.js";
import { GAME_VERSION } from "./version.js";

export interface CreationResult {
  nickname: string;
  skinId: string;
  /** Id da identidade escolhida (P-002) — `HEROES[].id`. */
  heroId: string;
}

const SKINS = config.account.king.skins.filter((s) => !s.legacy && isSkinUnlocked(s, 1));

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
  celestial: "Celestial",
};

/**
 * Moldura da tela de login/criação (ADR-033): fundo próprio, logotipo "Idle Tower Adventure",
 * cartão central e a zona reservada ao login do Google. Os números vêm de `CREATION_LAYOUT`.
 * Quem for plugar o Google renderiza o botão DENTRO de `[data-auth-slot]` — a zona já existe.
 */
function CreationShell({ wide, children }: { wide: boolean; children: ReactNode }) {
  const L = CREATION_LAYOUT;
  const bg = assetUrl(LOGIN_ASSETS.background);
  const logo = assetUrl(LOGIN_ASSETS.logo);
  const style = {
    "--login-focus": L.backdropFocus,
    "--login-shade": String(L.shade),
    "--login-logo-w": `${L.logo.maxWidthPx}px`,
    "--login-logo-h": `${L.logo.maxHeightVh}vh`,
    "--login-card-w": `${wide ? L.card.heroMaxWidthPx : L.card.kingMaxWidthPx}px`,
    "--login-auth-h": `${L.authSlot.heightPx}px`,
    "--login-auth-w": `${L.authSlot.maxWidthPx}px`,
    ...(bg ? { "--login-bg": `url("${new URL(bg, document.baseURI).href}")` } : {}),
  } as CSSProperties;
  return (
    <div className="tia-login" style={style} data-has-art={bg ? "true" : "false"}>
      <div className="tia-login__shade" aria-hidden="true" />
      <header className="tia-login__logo">
        {logo ? <img src={logo} alt="Idle Tower Adventure" /> : <h1>Idle Tower Adventure</h1>}
      </header>
      <div className="tia-creation">{children}</div>
      <div className="tia-login__auth" data-auth-slot="google" aria-label="Entrar com uma conta" />
      <footer className="tia-login__credits">
        <span>{GAME_VERSION}</span> · Arte: Assets by Nika Studio
      </footer>
    </div>
  );
}

export function CreationScreen({ onSubmit }: { onSubmit: (result: CreationResult) => void }) {
  const [step, setStep] = useState<"king" | "hero">("king");
  const [name, setName] = useState("");
  const [skinId, setSkinId] = useState(SKINS[0]!.id);
  const [heroId, setHeroId] = useState(HEROES[0]!.id);

  const validation = useMemo(() => validateNickname(name), [name]);
  const canSubmit = validation.ok;
  const chosen = HEROES.find((h) => h.id === heroId)!;

  if (step === "hero") {
    return (
      <CreationShell wide>
        <div className="tia-creation__card tia-frame-9">
          <h2 className="tia-creation__title">Convocação do Campeão</h2>
          <p className="tia-creation__lead">
            Quatro campeões juraram lealdade ao Reino — mas só <strong>um</strong> parte ao seu
            lado agora. Os outros aguardam ser encontrados pelo mundo.
          </p>

          <fieldset className="tia-creation__skins">
            <legend className="tia-creation__label">Escolha o seu campeão</legend>
            <div className="tia-hero-pick-grid">
              {HEROES.map((hero) => {
                const cls = classes.find((c) => c.id === hero.classId);
                const skill = skillsById[hero.signatureSkillId];
                return (
                  <button
                    key={hero.id}
                    type="button"
                    className={`tia-hero-pick ${hero.id === heroId ? "tia-hero-pick--selected" : ""}`}
                    aria-pressed={hero.id === heroId}
                    onClick={() => setHeroId(hero.id)}
                  >
                    <img
                      className="tia-hero-pick__portrait"
                      src={assetUrl(cls?.assets.portrait ?? "") ?? undefined}
                      alt=""
                    />
                    <strong className="tia-hero-pick__name">{hero.name}</strong>
                    <span className="tia-hero-pick__epithet">{hero.epithet}</span>
                    <span className={`tia-hero-pick__rarity tia-hero-pick__rarity--${hero.rarity}`}>
                      {RARITY_LABEL[hero.rarity]}
                    </span>
                    <span className="tia-hero-pick__role">{cls?.role ?? ""}</span>
                    <span className="tia-hero-pick__style">{hero.combatStyle}</span>
                    <span className="tia-hero-pick__skill">
                      Assinatura: <strong>{skill?.name ?? hero.signatureSkillId}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="tia-creation__actions">
            <ActionButton label="Voltar" variant="secondary" icon="back" onClick={() => setStep("king")} />
            <ActionButton
              variant="primary"
              icon="enter"
              label={`Convocar ${chosen.name}`}
              onClick={() => onSubmit({ nickname: validation.ok ? validation.value : name, skinId, heroId })}
            />
          </div>
        </div>
      </CreationShell>
    );
  }

  return (
    <CreationShell wide={false}>
      <form
        className="tia-creation__card tia-frame-9"
        onSubmit={(event) => {
          event.preventDefault();
          if (!validation.ok) return;
          setStep("hero");
        }}
      >
        <h2 className="tia-creation__title">Coroe o seu Rei</h2>
        <p className="tia-creation__lead">
          O Rei é você: a conta, o Reino e os seus campeões. Escolha um nome e uma aparência —
          heróis são súditos, e é por eles que você luta.
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

        <ActionButton type="submit" variant="primary" icon="crown" disabled={!canSubmit} label="Escolher campeão" />
      </form>
    </CreationShell>
  );
}
