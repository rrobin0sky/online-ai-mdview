import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, PenLine } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onSwitchToEdit?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DocumentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("DocumentErrorBoundary caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center p-8 select-text">
          <div className="max-w-md w-full p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 shadow-xl backdrop-blur-md flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
              {this.props.fallbackTitle || "Document Display Notice"}
            </h3>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
              An error occurred while parsing or rendering the document. You can try refreshing the preview or switch to raw editor mode.
            </p>

            {this.state.error && (
              <pre className="w-full max-h-24 overflow-auto p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 text-left mb-5 border border-zinc-200/60 dark:border-zinc-800/60">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>

              {this.props.onSwitchToEdit && (
                <button
                  type="button"
                  onClick={this.props.onSwitchToEdit}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span>Edit Raw Text</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
