/**
 * The shell error boundary (plan §0a-13, W1-T7). Sits ABOVE `<Layout>` so a
 * crash in any route is caught and the shell shows a fallback instead of a
 * white screen. Two behaviors beyond a bare boundary:
 *
 * - **Location-change auto-reset.** After an error, changing the route resets
 *   the boundary so navigating away recovers (a stuck error page is a common
 *   ra-core complaint). Implemented the ra-core way — an effect that RESETS the
 *   boundary's error state when `location.pathname` changes
 *   (`useResetErrorBoundaryOnLocationChange`), NOT a `key`. A `key` tied to
 *   `location.pathname` would REMOUNT the entire Layout + routes subtree on every
 *   navigation, destroying form/component state (and breaking URL-synced
 *   TabbedForm/WizardForm). The subtree therefore stays MOUNTED across
 *   navigations; only the captured error is cleared on a route change.
 * - **`errorInfo` capture.** `componentDidCatch` records React's
 *   `componentStack`, passed to the fallback so a dev-facing default can show it.
 *
 * The default fallback is overridable via the `error` page slot (plan §0a-13):
 * `<Admin error={…}>` / `<Admin.Error>…</Admin.Error>` supplies a custom node,
 * rendered in place of `DefaultErrorFallback`.
 *
 * In-house (NOT `react-error-boundary`): a ~40-line class boundary avoids a new
 * runtime dependency. React error boundaries MUST be class components (there is
 * no hook equivalent for `getDerivedStateFromError`), so this one file is the
 * shell's only class component. See the report DEVIATION note.
 */

import {
  Component,
  type ErrorInfo,
  isValidElement,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { useLocation } from "../router/nav-hooks";

/** What a custom `error` slot receives (so it can render the error + reset). */
export interface ErrorFallbackProps {
  /** The thrown error. */
  error: Error;
  /** React's captured component stack (dev-facing), or null before capture. */
  errorInfo: ErrorInfo | null;
  /** Reset the boundary imperatively (in addition to the location auto-reset). */
  resetErrorBoundary: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryClassProps {
  /**
   * The fallback. A render function receives `ErrorFallbackProps`; a node is
   * rendered as-is (the `error` page slot's content, which cannot take props).
   */
  fallback: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  children: ReactNode;
}

/**
 * The class boundary. Stays MOUNTED across navigations (no `key`); its error
 * state is cleared imperatively via `reset()` — either by the fallback's action
 * or by `ShellErrorBoundary`'s location-change effect (plan §0a-13, B1 fix).
 */
class ErrorBoundaryClass extends Component<
  ErrorBoundaryClassProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture the component stack for the dev-facing default (plan §0a-13).
    this.setState({ error, errorInfo });
  }

  /**
   * Clear the captured error (public so the location-change effect can drive it
   * — the ra-core `useResetErrorBoundaryOnLocationChange` reset). Idempotent:
   * `setState` no-ops when the boundary already has no error.
   */
  reset = (): void => {
    if (this.state.error == null) return;
    this.setState({ error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { error, errorInfo } = this.state;
    const { fallback, children } = this.props;
    if (error == null) return children;

    if (typeof fallback === "function") {
      return fallback({ error, errorInfo, resetErrorBoundary: this.reset });
    }
    // A node fallback (the `error` slot) is rendered verbatim; an absent slot
    // (`undefined`/`null`) falls back to the built-in default.
    return fallback != null ? (
      fallback
    ) : (
      <DefaultErrorFallback
        error={error}
        errorInfo={errorInfo}
        resetErrorBoundary={this.reset}
      />
    );
  }
}

/**
 * The built-in fallback: the error message + (dev-facing) component stack, and
 * a reset action. Deliberately minimal + framework-lean — the shadcn error page
 * (P7) replaces it via the `error` slot; this only guarantees the shell degrades
 * to *something* readable instead of a blank screen.
 */
export function DefaultErrorFallback({
  error,
  errorInfo,
  resetErrorBoundary,
}: ErrorFallbackProps): ReactNode {
  return (
    <div role="alert" data-chelone="error-boundary">
      <h1>Something went wrong.</h1>
      <p>{error.message}</p>
      {errorInfo?.componentStack ? <pre>{errorInfo.componentStack}</pre> : null}
      <button type="button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}

export interface ShellErrorBoundaryProps {
  /**
   * Custom fallback: the `error` page slot's node (rendered verbatim on error),
   * or a render function receiving `ErrorFallbackProps`. Omit for the built-in
   * `DefaultErrorFallback`.
   */
  fallback?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
  children: ReactNode;
}

/**
 * The shell error boundary with location-change auto-reset (plan §0a-13, B1 fix).
 * The inner class boundary stays MOUNTED across navigations — no `key`, so the
 * Layout + routes subtree it wraps is never remounted (component/form state
 * survives every nav). On a `location.pathname` change AFTER an error, an effect
 * clears the boundary's captured error (the ra-core
 * `useResetErrorBoundaryOnLocationChange` reset), so navigating away from a
 * crashed route recovers. Callers place this ABOVE `<Layout>`.
 */
export function ShellErrorBoundary({
  fallback,
  children,
}: ShellErrorBoundaryProps): ReactNode {
  const location = useLocation();
  const boundaryRef = useRef<ErrorBoundaryClass>(null);

  // Reset the captured error whenever the pathname changes (parity §0a-13). The
  // ref targets the class instance; `reset()` is a no-op when there is no error,
  // so this safely fires on every navigation (the first run — no prior error —
  // is inert). Keyed on `pathname` ALONE: a search/hash change is not a route
  // change and must not clear an error prematurely.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on pathname change only; `reset()` reads the freshest instance via the ref.
  useEffect(() => {
    boundaryRef.current?.reset();
  }, [location.pathname]);

  // A slot node fallback is passed through; a render function is passed through;
  // `undefined` means "use the default". `isValidElement` keeps a node fallback
  // from being mistaken for a render function (both are truthy).
  const resolved =
    typeof fallback === "function" && !isValidElement(fallback)
      ? fallback
      : (fallback ?? undefined);
  return (
    <ErrorBoundaryClass ref={boundaryRef} fallback={resolved}>
      {children}
    </ErrorBoundaryClass>
  );
}
