import { Component, type ErrorInfo, type ReactNode } from "react";
import { downloadSave, pageActions } from "./saveTools.js";

interface Props {
  children: ReactNode;
}
interface BoundaryState {
  error: Error | null;
  saved: boolean | null;
}

/**
 * Última rede de segurança da UI: uma exceção de render NÃO pode virar tela branca com o
 * progresso do jogador preso dentro. Mostra o que fazer (recarregar / baixar uma cópia do save).
 * O save é lido do localStorage — não depende do estado React que acabou de quebrar.
 */
export class ErrorBoundary extends Component<Props, BoundaryState> {
  override state: BoundaryState = { error: null, saved: null };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ui] erro de renderização:", error, info.componentStack);
  }

  private readonly backup = async () => {
    try {
      this.setState({ saved: await downloadSave(null) });
    } catch {
      this.setState({ saved: false });
    }
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="tia-app tia-crash" role="alert">
        <h1>Algo deu errado</h1>
        <p>
          O jogo encontrou um problema inesperado. Seu progresso fica salvo neste navegador — recarregar a página costuma
          resolver.
        </p>
        <p className="tia-muted">Detalhe: {this.state.error.message}</p>
        <div className="tia-crash__actions">
          <button type="button" className="tia-btn tia-btn--primary" onClick={() => pageActions.reload()}>
            Recarregar o jogo
          </button>
          <button type="button" className="tia-btn tia-btn--secondary" onClick={() => void this.backup()}>
            Baixar uma cópia do save
          </button>
        </div>
        {this.state.saved === true && <p className="tia-note">Cópia baixada. Guarde o arquivo em local seguro.</p>}
        {this.state.saved === false && <p className="tia-note--bad">Não foi possível ler o save deste navegador.</p>}
      </div>
    );
  }
}
