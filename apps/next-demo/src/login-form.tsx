"use client";

/**
 * `/login`: `<LoginPage>` in its own `<CheloneProvider>`, because the proxy
 * sends a logged-out visit here before `<Admin>` mounts. Signing in goes
 * through the server action that sets the cookie, then replaces to the page the
 * visitor came for. That target is a URL parameter, so only a same-origin path
 * is followed.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defaultMessages,
  fakeDataProvider,
  safeRedirectTarget,
} from "@chelone/core";
import {
  CheloneProvider,
  LoginPage,
  RouterAdapterProvider,
} from "@chelone/react";
import { nextRouterAdapter } from "@chelone/react/next";
import { QueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { signIn } from "./session-actions";

export interface LoginFormProps {
  /** The `redirect` URL parameter, as the visitor's URL carried it. */
  redirect?: string;
}

/** Nothing here reads data, but the provider needs one. */
const dataProvider = fakeDataProvider({});

export function LoginForm({ redirect }: LoginFormProps) {
  const router = useRouter();
  const target = safeRedirectTarget(redirect);
  const targetRef = useRef(target);
  targetRef.current = target;
  const [services] = useState(() => {
    const authProvider: AuthProvider = {
      login: async ({ email }) => {
        await signIn(typeof email === "string" ? email : "");
        router.replace(targetRef.current);
      },
      logout: async () => {},
      checkAuth: async () => {
        throw new Error("Not signed in");
      },
      checkError: async () => {},
    };
    return {
      authProvider,
      queryClient: new QueryClient(),
      i18n: createI18n({ locale: "en", messages: { en: defaultMessages } }),
      notifications: createNotificationStore(),
    };
  });
  return (
    <CheloneProvider dataProvider={dataProvider} {...services}>
      <RouterAdapterProvider adapter={nextRouterAdapter}>
        <LoginPage />
      </RouterAdapterProvider>
    </CheloneProvider>
  );
}
