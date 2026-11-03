/**
 * `<SetPasswordForm>` and `<SetPasswordPage>` tests: the form that finishes a
 * Supabase password reset or invite with the tokens from the emailed link.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defineMessages,
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
import { type Component, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import SetPasswordForm from "./set-password-form.vue";
import SetPasswordPage from "./set-password-page.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.innerHTML = "";
});

type SetAuthProvider = AuthProvider & {
  setPassword: (params: {
    access_token: string;
    refresh_token: string;
    password: string;
  }) => Promise<void>;
};

function makeAuthProvider(
  setPassword: SetAuthProvider["setPassword"] = async () => {},
): SetAuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    setPassword,
  };
}

const bothTokens = "/set-password?access_token=access&refresh_token=refresh";

/** Mount `component` in `<Admin>`'s default slot, at `entry`. */
async function mountIn(
  component: Component,
  opts: { authProvider?: SetAuthProvider; entry?: string } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:rest(.*)*", component: { render: () => null } }],
  });
  await router.push(opts.entry ?? bothTokens);
  await router.isReady();
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
              notifications: createNotificationStore(),
              authProvider: opts.authProvider ?? makeAuthProvider(),
            },
            { default: () => h(component) },
          );
      },
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

const passwordInputs = (wrapper: VueWrapper) =>
  wrapper.findAll<HTMLInputElement>("input[type=password]");
const saveButton = (wrapper: VueWrapper) =>
  wrapper.get<HTMLButtonElement>("button[type=submit]");

async function fill(wrapper: VueWrapper, password: string, confirm: string) {
  const [first, second] = passwordInputs(wrapper);
  await first?.setValue(password);
  await second?.setValue(confirm);
  await saveButton(wrapper).trigger("click");
  await flushPromises();
}

describe("<SetPasswordForm>", () => {
  it("SetPasswordForm shows two password fields and a Save button when both tokens are present", async () => {
    const { wrapper } = await mountIn(SetPasswordForm);

    expect(passwordInputs(wrapper)).toHaveLength(2);
    expect(wrapper.findAll("label").map((label) => label.text())).toEqual([
      "Password *",
      "Confirm password *",
    ]);
    expect(saveButton(wrapper).text()).toBe("Save");
  });

  it("marks both fields as a new password and focuses the first", async () => {
    const { wrapper } = await mountIn(SetPasswordForm);

    const [first, second] = passwordInputs(wrapper);
    expect(first?.attributes("autocomplete")).toBe("new-password");
    expect(second?.attributes("autocomplete")).toBe("new-password");
    expect(document.activeElement).toBe(first?.element);
  });

  it("mismatched passwords show the mismatch error on both fields and do not call setPassword", async () => {
    const setPassword = vi.fn(async () => {});
    const { wrapper } = await mountIn(SetPasswordForm, {
      authProvider: makeAuthProvider(setPassword),
    });

    await fill(wrapper, "hunter2", "hunter3");

    expect(wrapper.text().split("Passwords do not match")).toHaveLength(3);
    expect(setPassword).not.toHaveBeenCalled();
  });

  it("correcting one field clears the mismatch error on the other", async () => {
    const { wrapper } = await mountIn(SetPasswordForm);

    await fill(wrapper, "hunter2", "hunter3");
    expect(wrapper.text()).toContain("Passwords do not match");

    await passwordInputs(wrapper)[1]?.setValue("hunter2");
    await flushPromises();

    expect(wrapper.text()).not.toContain("Passwords do not match");
  });

  it("matching passwords call setPassword with both tokens and the password", async () => {
    const setPassword = vi.fn(async () => {});
    const { wrapper, router } = await mountIn(SetPasswordForm, {
      authProvider: makeAuthProvider(setPassword),
    });

    await fill(wrapper, "hunter2", "hunter2");

    expect(setPassword).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
      password: "hunter2",
    });
    expect(router.currentRoute.value.path).toBe("/");
  });

  it("missing tokens show the missing-tokens message and no form", async () => {
    const { wrapper, router } = await mountIn(SetPasswordForm, {
      entry: "/set-password?access_token=access",
    });

    expect(wrapper.text()).toContain(
      "Access and refresh tokens are missing from the link",
    );
    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.find("input").exists()).toBe(false);
    const link = wrapper
      .findAll("a")
      .find((anchor) => anchor.text() === "Back to login");
    expect(link?.attributes("href")).toBe("/login");
    expect(router.currentRoute.value.path).toBe("/set-password");
  });
});

describe("<SetPasswordPage>", () => {
  it("SetPasswordPage shows the new password title", async () => {
    const { wrapper } = await mountIn(SetPasswordPage);

    expect(wrapper.get("h1").text()).toBe("Choose your password");
    expect(saveButton(wrapper).text()).toBe("Save");
  });
});
