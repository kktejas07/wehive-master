import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[hsl(var(--destructive))]/10">
              <AlertTriangle className="w-10 h-10 text-[hsl(var(--destructive))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                Something went wrong
              </h1>
              <p className="mt-2 text-[hsl(var(--muted-foreground))]">
                We encountered an unexpected error. Your progress has been saved.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try again
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                <Home className="w-4 h-4" />
                Go home
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 rounded-xl bg-[hsl(var(--muted))] text-left">
                <summary className="font-semibold cursor-pointer">Error details</summary>
                <pre className="mt-2 text-xs overflow-auto text-[hsl(var(--destructive))]">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PageErrorBoundary({ children, fallback }) {
  return (
    <ErrorBoundary>
      {fallback ? (
        <ErrorBoundary fallback={fallback}>
          {children}
        </ErrorBoundary>
      ) : (
        children
      )}
    </ErrorBoundary>
  );
}