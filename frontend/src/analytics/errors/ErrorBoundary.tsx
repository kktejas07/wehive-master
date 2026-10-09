/**
 * Analytics React Error Boundary
 */

import React, { Component, ReactNode } from 'react';
import { captureError } from './captureError';

interface Props {
  scope?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureError(error, {
      scope: this.props.scope || 'react_error_boundary',
      severity: 'fatal',
      props: { component_stack: errorInfo.componentStack },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 my-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-white text-center max-w-lg mx-auto shadow-xl">
          <h3 className="text-lg font-bold text-red-400 mb-2">Something went wrong</h3>
          <p className="text-sm text-slate-300 mb-4">
            An unexpected error occurred in {this.props.scope || 'this section'}.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition-colors"
          >
            Retry Section
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
