/**
 * `<ForgotPasswordForm>` and `<ForgotPasswordPage>` tests: the email form that
 * asks Supabase for a reset email, and the page that frames it.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
  type NotificationStore,
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
import { type Component, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import ForgotPasswordForm from "./forgot-password-form.vue";
import ForgotPasswordPage from "./forgot-password-page.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.innerHTML = "";
});

type ResetAuthProvider = AuthProvider & {
  resetPassword: (params: { email: string }) => Promise<void>;
};

function makeAuthProvider(
  resetPassword: ResetAuthProvider["resetPassword"] = async () => {},
): ResetAuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    resetPassword,
  };
}

/** Mount `component` in `<Admin>`'s default slot. */
function mountIn(
  component: Component,
  opts: {
    authProvider?: ResetAuthProvider;
    notifications?: NotificationStore;
  } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:rest(.*)*", component: { render: () => null } }],
  });
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
                messages: {
                  en: {
                    ...supabaseEnglishMessages,
                    ...defineMessages({
                      "chelone.validation.required": "Required",
                    }),
                  },
                },
              }),
              notifications: opts.notifications ?? createNotificationStore(),
              authProvider: opts.authProvider ?? makeAuthProvider(),
            },
            { default: () => h(component) },
          );
      },
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  return { wrapper, router };
}

const emailInput = (wrapper: VueWrapper) =>
  wrapper.get<HTMLInputElement>("input[type=email]");
const submitButton = (wrapper: VueWrapper) =>
  wrapper.get<HTMLButtonElement>("button[type=submit]");

describe("<ForgotPasswordForm>", () => {
  it("ForgotPasswordForm shows the email field, the Reset password button and the Back to login link", async () => {
    const { wrapper } = mountIn(ForgotPasswordForm);
    await flushPromises();

    expect(wrapper.findAll("label").map((label) => label.text())).toEqual([
      "Email *",
    ]);
    expect(submitButton(wrapper).text()).toBe("Reset password");
    const link = wrapper
      .findAll("a")
      .find((anchor) => anchor.text() === "Back to login");
    expect(link?.attributes("href")).toBe("/login");
  });

  it("marks the field as an email and focuses it", async () => {
    const { wrapper } = mountIn(ForgotPasswordForm);
    await flushPromises();

    expect(emailInput(wrapper).attributes("autocomplete")).toBe("email");
    expect(document.activeElement).toBe(emailInput(wrapper).element);
  });

  it("an empty email shows Required and does not call resetPassword", async () => {
    const resetPassword = vi.fn(async () => {});
    const { wrapper } = mountIn(ForgotPasswordForm, {
      authProvider: makeAuthProvider(resetPassword),
    });
    await flushPromises();

    await submitButton(wrapper).trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Required");
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("calls resetPassword with the email", async () => {
    const resetPassword = vi.fn(async () => {});
    const { wrapper } = mountIn(ForgotPasswordForm, {
      authProvider: makeAuthProvider(resetPassword),
    });
    await flushPromises();

    await emailInput(wrapper).setValue("user@example.com");
    await submitButton(wrapper).trigger("click");
    await flushPromises();

    expect(resetPassword).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("a rejection from resetPassword shows its message as a warning", async () => {
    const notifications = createNotificationStore();
    // The shell's `<Notification>` drains the store, so record the calls.
    const notify = vi.spyOn(notifications, "notify");
    const { wrapper } = mountIn(ForgotPasswordForm, {
      authProvider: makeAuthProvider(async () => {
        throw new Error("Email rate limit exceeded");
      }),
      notifications,
    });
    await flushPromises();

    await emailInput(wrapper).setValue("user@example.com");
    await submitButton(wrapper).trigger("click");
    await flushPromises();

    expect(notify).toHaveBeenCalledWith("Email rate limit exceeded", {
      type: "warning",
      messageArgs: { _: "Email rate limit exceeded" },
    });
  });
});

describe("<ForgotPasswordPage>", () => {
  it("ForgotPasswordPage shows the Forgot password title and the details line around the form", async () => {
    const { wrapper } = mountIn(ForgotPasswordPage);
    await flushPromises();

    expect(wrapper.get("h1").text()).toBe("Forgot your password?");
    expect(wrapper.text()).toContain(
      "Enter your email to receive a link to reset your password.",
    );
    expect(submitButton(wrapper).text()).toBe("Reset password");
  });
});
