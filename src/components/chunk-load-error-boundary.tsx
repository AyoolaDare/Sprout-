'use client';

import React from 'react';
import LoadingLogo from './loading-logo';

interface ChunkLoadErrorBoundaryState {
  hasError: boolean;
  isReloading: boolean;
}

export class ChunkLoadErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ChunkLoadErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, isReloading: false };
  }

  static getDerivedStateFromError(error: Error): ChunkLoadErrorBoundaryState {
    // Check if the error is a ChunkLoadError
    if (error.name === 'ChunkLoadError' || /Loading chunk .* failed/i.test(error.message)) {
      return { hasError: true, isReloading: false };
    }
    // For other errors, re-throw to let other boundaries handle it.
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (error.name === 'ChunkLoadError' || /Loading chunk .* failed/i.test(error.message)) {
        console.warn('Caught a ChunkLoadError, preparing to reload the page.');
        if (typeof window !== 'undefined') {
            this.setState({ isReloading: true });
            window.location.reload();
        }
    } else {
      console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError || this.state.isReloading) {
      // Render a fallback UI while the page reloads
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
          <LoadingLogo />
          <p className="text-muted-foreground animate-fade-in-text">Updating application...</p>
        </div>
      );
    }

    return this.props.children;
  }
}
