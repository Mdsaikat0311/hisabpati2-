import React from 'react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'Unexpected application error' };
  }

  render() {
    if (this.state.hasError) {
      let displayMsg = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          displayMsg = `Cloud Sync Error (${parsed.operationType || 'operation'}): ${parsed.error}`;
        }
      } catch {
        // plain string message
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0B132B] text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center mx-auto font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 break-words">{displayMsg}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition"
            >
              Reload Hishab Pati
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
