/**
 * The Supabase auth pages, mounted as `<CustomRoutes noLayout>`: they are for
 * people who are not signed in, so they render outside the layout and the auth
 * gate. They run against the stub provider from `@chelone/demo-data`, which
 * makes no network call, so any email and password sign in and no email is sent.
 *
 * The pages link to each other by their static paths: the login page to
 * `/forgot-password`, and the forgot-password and set-password pages (and the
 * redirect after a reset email) to `/login`. `/forgot-password` shows the same
 * page as `/auth/forgot-password`. `/login` is the demo's own sign-in page
 * (`pages/login.tsx`), not the Supabase one at `/auth/login`, so no step of the
 * flow ends on the demo's not-found page.
 */

import { stubSupabaseAuthProvider } from "@chelone/demo-data";
import { CheloneProvider, useCheloneContext } from "@chelone/react";
import {
  ForgotPasswordPage,
  SetPasswordPage,
  SupabaseLoginPage,
} from "@chelone/react/supabase";
import { QueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Route } from "react-router";

const authProvider = stubSupabaseAuthProvider();

/**
 * The app's own services with the stub auth provider in place of the demo's,
 * and a query client of its own: the auth state is cached under one key, so
 * sharing the app's client would show the demo's signed-in user to the login
 * page, which then redirects at once, and the stub's signed-out state to the
 * demo's user menu.
 */
function StubClient({ children }: { children: ReactNode }) {
  const context = useCheloneContext();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <CheloneProvider
      {...context}
      queryClient={queryClient}
      authProvider={authProvider}
    >
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
