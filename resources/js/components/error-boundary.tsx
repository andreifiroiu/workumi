import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface ErrorBoundaryState {
    error: Error | null;
    componentStack: string | null;
}

/**
 * Without this, a single render throw unmounts the React root and leaves a blank white page with
 * nothing but a console entry. Show what broke instead.
 */
export class ErrorBoundary extends Component<
    PropsWithChildren,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = { error: null, componentStack: null };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Unhandled render error', error, errorInfo);
        this.setState({ componentStack: errorInfo.componentStack ?? null });
    }

    render() {
        const { error, componentStack } = this.state;

        if (!error) {
            return this.props.children;
        }

        return (
            <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
                <h1 className="text-xl font-semibold">
                    Something went wrong rendering this page
                </h1>
                <p className="text-sm text-muted-foreground">
                    {error.message}
                </p>
                {import.meta.env.DEV && (
                    <pre className="max-h-96 overflow-auto rounded-md bg-neutral-100 p-4 text-xs dark:bg-neutral-900">
                        {error.stack}
                        {componentStack}
                    </pre>
                )}
                <div>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-100 dark:text-black"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }
}
