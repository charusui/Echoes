import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-plum-950 text-parchment-100 p-6 flex items-center justify-center">
          <div className="px-frame px-frame-wood w-full max-w-2xl flex flex-col gap-4 p-6">
            <h1 className="font-bold text-3xl leading-none">Oops! Something broke.</h1>
            <p className="text-base text-parchment-300">Reload the game to keep playing. If this keeps happening, share the details below with the team.</p>
            <pre className="px-frame px-frame-inset max-h-64 overflow-auto whitespace-pre-wrap p-3 font-label text-[8px] leading-relaxed text-parchment-300">
              {this.state.error?.toString()}
              {'\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
            <button type="button" onClick={() => window.location.reload()} className="px-btn px-btn-primary self-start min-h-11 px-5 text-base">
              Reload Game
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
