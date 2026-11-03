import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary capturou erro não tratado:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      localStorage.removeItem("ataFormData");
      localStorage.removeItem("aviva_draft");
    } catch {}
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border bg-card text-card-foreground shadow-lg space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">Ops! Algo deu errado ao carregar a página</h2>
              <p className="text-xs text-muted-foreground">
                Um erro inesperado aconteceu na exibição dos dados. Você pode recarregar ou limpar o cache local para restaurar o sistema.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-lg bg-muted/60 text-left overflow-x-auto text-[11px] font-mono text-muted-foreground border">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button onClick={this.handleReload} className="flex-1 gap-2">
                <RefreshCcw className="w-4 h-4" /> Recarregar Página
              </Button>
              <Button onClick={this.handleClearAndReload} variant="outline" className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" /> Limpar Rascunho
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

