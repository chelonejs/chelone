/**
 * `/login` — outside `/admin`, so a signed-out visitor can reach it while every
 * admin page is gated. `redirectAuthenticatedBeforeLoad` is the mirror guard: a
 * visitor who is already signed in never sees the form, and lands on the
 * `?redirect=` page they came from, or `/` when that target is off-site.
 *
 * `<LoginPage>` sits inside `<CheloneProvider>` because it is a chelone
 * component: `<LoginForm>` calls `useLogin()`, which needs the auth provider.
 */

import {
  CheloneProvider,
  LoginPage,
  RouterAdapterProvider,
  useAuthState,
} from "@chelone/react";
import {
  redirectAuthenticatedBeforeLoad,
  tanstackHostRouterAdapter,
} from "@chelone/react/tanstack-router";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context, location }) => {
    await redirectAuthenticatedBeforeLoad({
      location,
      authProvider: context.authProvider,
      queryClient: context.queryClient,
    });
  },
  component: LoginShell,
});

function LoginShell() {
  const { authProvider, dataProvider, notifications, queryClient } =
    Route.useRouteContext();
  return (
    <CheloneProvider
      authProvider={authProvider}
      dataProvider={dataProvider}
      notifications={notifications}
      queryClient={queryClient}
    >
      <RouterAdapterProvider adapter={tanstackHostRouterAdapter}>
        <LoginScreen />
      </RouterAdapterProvider>
    </CheloneProvider>
  );
}

function LoginScreen() {
  const router = useRouter();
  const { data } = useAuthState();
  const signedIn = data?.authenticated === true;

  // The guard does the sending: `invalidate()` re-runs `beforeLoad`, which sees
  // the session and redirects to the page the visitor came from.
  useEffect(() => {
    if (signedIn) void router.invalidate();
  }, [signedIn, router]);

  // The form leaves the screen in the same commit, so `<LoginPage>`'s own
  // "already signed in, go to `/`" effect never gets to outrun the guard.
  if (signedIn) return null;

  return <LoginPage />;
}
