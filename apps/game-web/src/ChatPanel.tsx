/**
 * Chat global (coluna direita, ADR-031). Conversa só com `ChatTransport` (ver `chat.ts`): hoje o
 * transporte é SIMULADO e o painel diz isso; o real entra trocando a fábrica, sem mexer aqui.
 * UX (docs/CHAT_SYSTEM.md §8): recolhível, contador de não lidas, silenciar, nunca sobrepõe a arena
 * (no mobile vira faixa inferior), auto-rolagem só se o jogador já estava no fim.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CHAT_LIMITS, createChatTransport, type ChatMessage, type ChatTransport } from "./chat.js";

export function ChatPanel({
  selfName,
  open,
  onToggle,
  transport,
}: {
  selfName: string;
  open: boolean;
  onToggle: () => void;
  /** Injetável (testes / chat real). */
  transport?: ChatTransport;
}) {
  const chat = useMemo(() => transport ?? createChatTransport(selfName), [transport, selfName]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => chat.history());
  const [unread, setUnread] = useState(0);
  const [muted, setMuted] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const stickRef = useRef(true);
  const openRef = useRef(open);
  const mutedRef = useRef(muted);
  openRef.current = open;
  mutedRef.current = muted;

  useEffect(() => {
    return chat.subscribe((m) => {
      if (mutedRef.current && m.kind === "player") return;
      setMessages((prev) => [...prev, m].slice(-CHAT_LIMITS.historySize));
      if (!openRef.current && m.kind !== "self") setUnread((n) => n + 1);
    });
  }, [chat]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const send = () => {
    const result = chat.send(draft);
    if (result.ok) {
      setDraft("");
      setError(null);
      stickRef.current = true;
    } else {
      setError(result.reason);
    }
  };

  return (
    <aside className={`tia-side tia-chat${open ? "" : " tia-chat--closed"}`} aria-label="Chat global">
      <header className="tia-side__head">
        <h2>
          Chat global{chat.simulated && <small className="tia-chat__sim"> (simulado — offline)</small>}
        </h2>
        <div className="tia-chat__tools">
          {open && (
            <button type="button" className="tia-chat__btn" aria-pressed={muted} onClick={() => setMuted((m) => !m)} title="Silenciar os outros jogadores">
              {muted ? "Silenciado" : "Silenciar"}
            </button>
          )}
          <button type="button" className="tia-chat__btn" aria-expanded={open} onClick={onToggle}>
            {open ? "Recolher" : `Chat${unread > 0 ? ` (${unread})` : ""}`}
          </button>
        </div>
      </header>
      {open && (
        <>
          <ul
            className="tia-chat__list"
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
            }}
          >
            {messages.map((m) => (
              <li key={m.id} className={`tia-chat__msg tia-chat__msg--${m.kind}`}>
                <time className="tia-chat__time" dateTime={new Date(m.at).toISOString()}>
                  {new Date(m.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </time>{" "}
                <strong className="tia-chat__author">{m.author}</strong>
                <span className="tia-chat__text"> {m.text}</span>
              </li>
            ))}
          </ul>
          <form
            className="tia-chat__form"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="tia-chat__input"
              type="text"
              value={draft}
              maxLength={CHAT_LIMITS.maxChars}
              placeholder="Escreva uma mensagem…"
              aria-label="Mensagem do chat"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" className="tia-chat__btn tia-chat__btn--send" disabled={draft.trim() === ""}>
              Enviar
            </button>
            <span className="tia-chat__count">
              {draft.length}/{CHAT_LIMITS.maxChars}
            </span>
            {error && (
              <span className="tia-chat__error" role="alert">
                {error}
              </span>
            )}
          </form>
        </>
      )}
    </aside>
  );
}
