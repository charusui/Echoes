import React, { Component, ErrorInfo, ReactNode } from 'react';

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
        <div className="min-h-screen bg-obsidian p-8 flex flex-col items-start justify-center">
          <h1 className="text-danger font-orbitron font-bold text-2xl mb-4">Application Crashed</h1>
          <div className="bg-dark-slate p-4 rounded text-light-gray font-space-mono text-sm w-full max-w-2xl overflow-auto whitespace-pre-wrap border border-danger/30">
            {this.state.error?.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-crimson rounded text-light-gray font-bold"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
