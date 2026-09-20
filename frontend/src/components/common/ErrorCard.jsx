import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ErrorCard({
  message = 'Unable to load threat intelligence data.',
  details,
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 border border-red-500/20 bg-red-950/10 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-100 mb-1">{message}</h4>
      {details && (
        <p className="text-xs text-slate-400 max-w-md font-mono mb-4 line-clamp-2">
          {details}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-medium text-slate-200 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorCard
          message="A component rendering error occurred."
          details={this.state.error?.message}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}
