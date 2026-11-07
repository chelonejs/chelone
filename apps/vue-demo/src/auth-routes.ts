/**
 * The Supabase auth pages, as `noLayout` custom routes: they are for people who
 * are not signed in, so they render outside the layout and the auth gate. They
 * run against the stub provider from `@chelone/demo-data` (see `StubClient.vue`),
 * which makes no network call, so any email and password sign in and no email
 * is sent.
 *
 * The login page links to `/forgot-password`, its static path, so that path
 * shows the same page as `/auth/forgot-password`.
 */

import { forgotPasswordPath } from "@chelone/supabase";
import type { CustomRoute } from "@chelone/vue";
import {
  ForgotPasswordPage,
  SetPasswordPage,
  SupabaseLoginPage,
} from "@chelone/vue/supabase";
import { defineComponent, h, type VNode } from "vue";
import StubClient from "./StubClient.vue";

function stubbed(page: () => VNode) {
  return defineComponent({ render: () => h(StubClient, page) });
}

const loginPage = stubbed(() =>
  h(SupabaseLoginPage, { providers: ["github", "google"] }),
);
const forgotPasswordPage = stubbed(() => h(ForgotPasswordPage));
const setPasswordPage = stubbed(() => h(SetPasswordPage));

export const authRoutes: CustomRoute[] = [
  { path: "auth/login", component: loginPage, noLayout: true },
  {
    path: "auth/forgot-password",
    component: forgotPasswordPage,
    noLayout: true,
  },
  { path: forgotPasswordPath, component: forgotPasswordPage, noLayout: true },
  { path: "auth/set-password", component: setPasswordPage, noLayout: true },
];

/** A recovery link as the email carries it: SetPasswordPage reads its tokens. */
export const recoveryLink =
  "/auth/set-password?access_token=demo-access&refresh_token=demo-refresh&type=recovery";
