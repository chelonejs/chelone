/**
 * `<SupabaseLoginPage>` tests: Chelone's login page plus a forgot password
 * link and one OAuth button per provider.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  fakeDataProvider,
} from "@chelone/core";
import { supabaseEnglishMessages } from "@chelone/supabase";
import { QueryClient } from "@tanstack/vue-query";
import {
  enableAutoUnmount,
  flushPromises,
  mount,
  type VueWrapper,
} from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import SupabaseLoginPage, {
  type SupabaseLoginPageProps,
} from "./supabase-login-page.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.innerHTML = "";
});

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    // Unauthenticated unless a test says otherwise.
    checkAuth: async () => Promise.reject(new Error("no")),
    checkError: async () => {},
    ...over,
  };
}

async function mountPage(
  props: SupabaseLoginPageProps = {},
  authProvider: AuthProvider = makeAuthProvider(),
  slots: { default?: () => unknown } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:rest(.*)*", component: { render: () => null } }],
  });
  await router.push("/login");
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              queryClient: new QueryClient({
                defaultOptions: {
                  queries: { retry: false },
                  mutations: { retry: false },
                },
              }),
              i18n: createI18n({
                locale: "en",
                messages: { en: supabaseEnglishMessages },
              }),
              notifications: createNotificationStore(),
              authProvider,
            },
            { default: () => h(SupabaseLoginPage, props, slots) },
          );
      },
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

const forgotLink = (wrapper: VueWrapper) =>
  wrapper.findAll("a").find((anchor) => anchor.text() === "Forgot password?");
const providerButtons = (wrapper: VueWrapper) =>
  wrapper
    .findAll("button")
    .filter((button) => button.text().startsWith("Sign in with "));
const hasOrDivider = (wrapper: VueWrapper) =>
  wrapper.findAll("div").some((div) => div.text() === "or");

describe("<SupabaseLoginPage>", () => {
  it("SupabaseLoginPage shows the email form and a Forgot password link by default", async () => {
    const { wrapper } = await mountPage();

    expect(wrapper.get("h1").text()).toBe("Sign in");
    expect(wrapper.find("input[type=email]").exists()).toBe(true);
    expect(wrapper.find("input[type=password]").exists()).toBe(true);
    expect(forgotLink(wrapper)?.attributes("href")).toBe("/forgot-password");
    expect(hasOrDivider(wrapper)).toBe(false);
  });

  it("the form signs in through authProvider.login with the email and password", async () => {
    const login = vi.fn(async () => {});
    const { wrapper } = await mountPage({}, makeAuthProvider({ login }));

    await wrapper.get("input[type=email]").setValue("user@example.com");
    await wrapper.get("input[type=password]").setValue("secret");
    await wrapper.get("button[type=submit]").trigger("click");
    await flushPromises();

    expect(login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret",
    });
  });

  it("providers adds one button per provider under an or divider", async () => {
    const login = vi.fn(async () => {});
    const { wrapper } = await mountPage(
      { providers: ["google", "github"] },
      makeAuthProvider({ login }),
    );

    expect(hasOrDivider(wrapper)).toBe(true);
    expect(wrapper.find("input[type=email]").exists()).toBe(true);
    expect(providerButtons(wrapper).map((button) => button.text())).toEqual([
      "Sign in with Google",
      "Sign in with Github",
    ]);

    await providerButtons(wrapper)[1]?.trigger("click");
    await flushPromises();
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "github" }),
    );
  });

  it("disableEmailPassword hides the form, the divider and the forgot password link", async () => {
    const { wrapper } = await mountPage({
      disableEmailPassword: true,
      providers: ["google"],
    });

    expect(providerButtons(wrapper).map((button) => button.text())).toEqual([
      "Sign in with Google",
    ]);
    expect(wrapper.find("input[type=email]").exists()).toBe(false);
    expect(hasOrDivider(wrapper)).toBe(false);
    expect(forgotLink(wrapper)).toBeUndefined();
  });

  it("disableForgotPassword hides the link and keeps the form", async () => {
    const { wrapper } = await mountPage({ disableForgotPassword: true });

    expect(wrapper.find("input[type=email]").exists()).toBe(true);
    expect(forgotLink(wrapper)).toBeUndefined();
  });

  it("the default slot replaces the form and the buttons", async () => {
    const { wrapper } = await mountPage(
      { providers: ["google"] },
      makeAuthProvider(),
      { default: () => h("p", "custom sign in") },
    );

    expect(wrapper.text()).toContain("custom sign in");
    expect(wrapper.find("input[type=email]").exists()).toBe(false);
    expect(hasOrDivider(wrapper)).toBe(false);
    expect(providerButtons(wrapper)).toHaveLength(0);
    expect(forgotLink(wrapper)).toBeUndefined();
  });

  it("an authenticated user is redirected to /", async () => {
    const { router } = await mountPage(
      {},
      makeAuthProvider({ checkAuth: async () => {} }),
    );

    expect(router.currentRoute.value.path).toBe("/");
  });
});
