/**
 * `<LoginPage>` — the default `loginPage` slot, shown to unauthenticated users
 * on a protected route. Ported from shadmin `admin/auth/login-page.tsx`;
 * composes `<AuthLayout>` + `<LoginForm>`.
 *
 * Chelone divergence: shadmin redirects already-authenticated users with
 * `useCheckAuth()` (imperative, ra-core). Chelone has no `useCheckAuth`, so the
 * page reads `useAuthState()` (the auth-state query, which resolves
 * `{ authenticated }` and never rejects) and redirects to `/` once it resolves
 * `authenticated: true`. The redirect fires from an effect keyed on that flag.
 */

import { type HTMLAttributes, type ReactNode, useEffect } from "react";
import { AuthLayout } from "@/components/admin/auth/auth-layout";
import { LoginForm } from "@/components/admin/auth/login-form";
import { useAuthState } from "../../../auth-hooks";
import { useRedirect } from "../../../router";

export interface LoginPageProps extends HTMLAttributes<HTMLDivElement> {
  /** Path a successful sign-in redirects to. Forwarded to `<LoginForm>`. */
  redirectTo?: string;
  /** Custom content in place of the default `<LoginForm>`. */
  children?: ReactNode;
}

function LoginPage(props: LoginPageProps) {
  const { redirectTo, children, ...rest } = props;
  const { data } = useAuthState();
  const redirect = useRedirect();

  // Redirect already-authenticated users away from the login page.
  useEffect(() => {
    if (data?.authenticated) {
      redirect("/");
    }
  }, [data?.authenticated, redirect]);

  return (
    <AuthLayout title="Sign in" {...rest}>
      {children ?? <LoginForm redirectTo={redirectTo} />}
    </AuthLayout>
  );
}

export { LoginPage };
