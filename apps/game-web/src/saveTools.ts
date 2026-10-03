/**
 * Ferramentas de save do jogador (Opções): exportar, importar, apagar — sempre COM rede de
 * segurança. Importar ou apagar primeiro guarda o save atual numa chave de backup
 * (`tia:save:local:backup`), então o erro mais caro de um jogo local (apagar sem querer) tem volta.
 */
import { LOCAL_ACCOUNT, LocalStoragePersistence, decodeSave, type GameState } from "@tia/game-core";

export const BACKUP_ACCOUNT = `${LOCAL_ACCOUNT}:backup`;

/** Indireção para o teste: `location.reload` do jsdom não é substituível. */
export const pageActions = {
  reload: () => window.location.reload(),
  download: (filename: string, text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

const persistence = () => new LocalStoragePersistence();

export function saveFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `project-tower-save-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`;
}

/** Texto do save atual (grava primeiro, para o arquivo refletir o jogo neste instante). */
export async function exportCurrentSave(state: GameState | null): Promise<string | null> {
  if (state) await state.save();
  return persistence().exportSave(LOCAL_ACCOUNT);
}

export async function downloadSave(state: GameState | null): Promise<boolean> {
  const raw = await exportCurrentSave(state);
  if (!raw) return false;
  pageActions.download(saveFileName(), raw);
  return true;
}

async function backupCurrent(): Promise<void> {
  const p = persistence();
  const raw = await p.exportSave(LOCAL_ACCOUNT);
  if (raw) await p.importSave(BACKUP_ACCOUNT, raw);
}

/** Valida SEM gravar. Lança `PersistenceError` com mensagem em PT-BR se o arquivo não presta. */
export function validateSaveText(text: string): void {
  decodeSave(text);
}

/** Importa um arquivo de save (já validado). Guarda o atual como backup. */
export async function importSaveText(text: string): Promise<void> {
  validateSaveText(text);
  await backupCurrent();
  await persistence().importSave(LOCAL_ACCOUNT, text);
}

/** Apaga o progresso (preferências de som ficam). Guarda o atual como backup. */
export async function resetProgress(): Promise<void> {
  await backupCurrent();
  await persistence().clear(LOCAL_ACCOUNT);
}

export async function hasBackup(): Promise<boolean> {
  return (await persistence().exportSave(BACKUP_ACCOUNT)) !== null;
}

/** Restaura o backup (desfazer importação/reset). */
export async function restoreBackup(): Promise<boolean> {
  const p = persistence();
  const raw = await p.exportSave(BACKUP_ACCOUNT);
  if (!raw) return false;
  await p.importSave(LOCAL_ACCOUNT, raw);
  return true;
}
