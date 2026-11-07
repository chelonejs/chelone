/**
 * The Supabase auth pages, mounted as `<CustomRoutes noLayout>`: they are for
 * people who are not signed in, so they render outside the layout and the auth
 * gate. They run against the stub provider from `@chelone/demo-data`, which
 * makes no network call, so any email and password sign in and no email is sent.
 *
 * The login page links to `/forgot-password`, its static path, so that path
 * shows the same page as `/auth/forgot-password`.
 */

import { stubSupabaseAuthProvider } from "@chelone/demo-data";
import { CheloneProvider, useCheloneContext } from "@chelone/react";
import {
  ForgotPasswordPage,
  SetPasswordPage,
  SupabaseLoginPage,
} from "@chelone/react/supabase";
import type { ReactNode } from "react";
import { Route } from "react-router";

const authProvider = stubSupabaseAuthProvider();

/** The app's own services with the stub auth provider in place of the demo's. */
function StubClient({ children }: { children: ReactNode }) {
  const context = useCheloneContext();
  return (
    <CheloneProvider {...context} authProvider={authProvider}>
      {children}
    </CheloneProvider>
  );
}

const loginPage = (
  <StubClient>
    <SupabaseLoginPage providers={["github", "google"]} />
  </StubClient>
);
const forgotPasswordPage = (
  <StubClient>
    <ForgotPasswordPage />
  </StubClient>
);
const setPasswordPage = (
  <StubClient>
    <SetPasswordPage />
  </StubClient>
);

export const authRoutes = [
  <Route key="login" path="auth/login" element={loginPage} />,
  <Route
    key="forgot-password"
    path="auth/forgot-password"
    element={forgotPasswordPage}
  />,
  <Route
    key="forgot-password-static"
    path={ForgotPasswordPage.path}
    element={forgotPasswordPage}
  />,
  <Route
    key="set-password"
    path="auth/set-password"
    element={setPasswordPage}
  />,
];

/** A recovery link as the email carries it: SetPasswordPage reads its tokens. */
export const recoveryLink =
  "/auth/set-password?access_token=demo-access&refresh_token=demo-refresh&type=recovery";
