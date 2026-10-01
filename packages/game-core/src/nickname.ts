/**
 * Normalização e validação de nickname do Rei.
 *
 * §6 exige unicidade, validação e proteção anti-abuso. Os LIMITES vêm da
 * config (`config.account.nickname`), marcados como provisórios (⛔ P-007):
 * comprimento, caracteres permitidos e lista reservada são decisão de
 * produto; trocar a decisão é editar dados, não este arquivo.
 *
 * Arquitetura (§63): este módulo é puro — não conhece React, DOM nem
 * relógio. Ele devolve CÓDIGOS de erro; a mensagem em PT-BR é renderizada
 * pela UI. Assim a mesma validação serve a qualquer superfície (web,
 * Android via navegador, futuro cliente de desktop).
 *
 * Unicidade: no MVP local (1 conta = 1 Rei, §8) a unicidade é estrutural —
 * só existe um Rei por conta. A unicidade ENTRE contas é server-side
 * (§ mercado/online) e não pode ser simulada no cliente.
 */

import { config } from "@tia/config";

export type NicknameErrorCode =
  | "empty"
  | "too_short"
  | "too_long"
  | "invalid_chars"
  | "reserved";

export type NicknameValidation =
  | { ok: true; value: string }
  | { ok: false; code: NicknameErrorCode };

/**
 * Normaliza para comparação: NFKC colapsa variantes Unicode (ﬁ → fi,
 * letras circunflexas compostas), e `toLocaleLowerCase("pt-BR")` cobre
 * maiúsculas acentuadas (Ã → ã) do jeito que o jogador lê.
 */
function foldForComparison(raw: string): string {
  return raw.normalize("NFKC").toLocaleLowerCase("pt-BR");
}

/**
 * Normalização do valor EXIBIDO: NFC (forma composta canônica — o save
 * guarda o que o jogador vê) e trim das pontas. Espaços internos não são
 * removidos aqui de propósito: o pattern da config decide se são válidos.
 */
export function normalizeNickname(raw: string): string {
  return raw.normalize("NFC").trim();
}

/**
 * Valida o nickname já normalizado (ou cru — normaliza antes de validar).
 *
 * Ordem das checagens: vazio → tamanho → caracteres → reservado. Um nome
 * curto demais com emoji reporta `too_short`, que é a causa mais próxima
 * de o jogador consertar.
 */
export function validateNickname(raw: string): NicknameValidation {
  const value = normalizeNickname(raw);
  const rules = config.account.nickname;

  if (value.length === 0) return { ok: false, code: "empty" };
  if (value.length < rules.minLength) return { ok: false, code: "too_short" };
  if (value.length > rules.maxLength) return { ok: false, code: "too_long" };

  const allowed = new RegExp(rules.pattern, "u");
  if (!allowed.test(value)) return { ok: false, code: "invalid_chars" };

  const folded = foldForComparison(value);
  if (rules.reserved.some((r) => foldForComparison(r) === folded)) {
    return { ok: false, code: "reserved" };
  }

  return { ok: true, value };
}

/**
 * Mensagens em PT-BR por código. Ficam aqui — e não em `@tia/ui` — porque
 * o jogo É PT-BR por decisão de produto (§62): toda superfície mostra a
 * mesma frase, sem cada uma inventar a sua.
 */
export const NICKNAME_MESSAGES: Record<NicknameErrorCode, string> = {
  empty: "Informe um nome para o Rei.",
  too_short: `O nome precisa de pelo menos ${config.account.nickname.minLength} caracteres.`,
  too_long: `O nome pode ter no máximo ${config.account.nickname.maxLength} caracteres.`,
  invalid_chars: "Use apenas letras, números, hífen e sublinhado.",
  reserved: "Esse nome é reservado. Escolha outro.",
};
