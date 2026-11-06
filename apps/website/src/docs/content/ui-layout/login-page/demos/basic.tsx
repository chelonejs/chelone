import type { AuthProvider } from "@chelone/core";
import { CheloneProvider, LoginPage, useCheloneContext } from "@chelone/react";
import type { ReactNode } from "react";

/**
 * `<LoginPage>` reads `useAuthState()`, which needs an `authProvider`, and the
 * preview ships none. This re-provides the preview's own services with one
 * whose `checkAuth` rejects, so the visitor reads as signed out and the page
 * keeps its form instead of redirecting to `/`.
 */
const signedOut: AuthProvider = {
  checkAuth: async () => {
    throw new Error("signed out");
  },
  checkError: async () => {},
  login: async () => {},
  logout: async () => {},
};

function SignedOut({ children }: { children: ReactNode }) {
  const context = useCheloneContext();
  return (
    <CheloneProvider {...context} authProvider={signedOut}>
      {children}
    </CheloneProvider>
  );
}

/** `<LoginPage>` shows a "Sign in" heading over an email field, a password field and a submit button. */
export default function LoginPageDemo() {
  return (
    <SignedOut>
      <LoginPage className="min-h-0 w-full" />
    </SignedOut>
  );
}
