/**
 * `<LoginWithEmail>` tests: the email + password sign-in form with an optional
 * custom submit handler, the Vue twin of `@chelone/react`'s
 * `auth/login-with-email.tsx`.
 *
 * Asserts: the fields and button render; a submit calls `authProvider.login`
 * (with `redirectTo`) or the `onSubmit` handler instead; a rejection from
 * either pushes an error notification; an empty field blocks the submit; an
 * ambient resource schema does not gate the submit; the `loading` prop disables
 * the button; `submitLabel` replaces the button text.
 */

import {
  type AuthProvider,
  createI18n,
  createNotificationStore,
  defineMessages,
  defineResources,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
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
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import { provideResourceContext } from "../../../resource-context";
import LoginWithEmail, {
  type LoginWithEmailProps,
} from "./login-with-email.vue";

enableAutoUnmount(afterEach);

afterEach(() => {
  document.body.innerHTML = "";
});

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

/** A registry whose schema is nothing like credentials, for the ambient-resource test. */
const postsRegistry = defineResources({
  posts: {
    schema: z.object({
      id: z.number().optional(),
      title: z.string().min(1, "Title is required"),
      body: z.string().min(1, "Body is required"),
    }),
  },
});

/** Mount `<LoginWithEmail>` in `<Admin>`'s default slot. */
function mountLogin(
  props: Partial<LoginWithEmailProps> = {},
  opts: {
    authProvider?: AuthProvider;
    notifications?: NotificationStore;
    /** Register a zod schema so the registry-schema path is live. */
    registry?: typeof postsRegistry;
    /** Provide an ambient `<Resource>` name the form could read. */
    resource?: string;
  } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  return mount(
    defineComponent({
      setup() {
        if (opts.resource) provideResourceContext(opts.resource);
        return () =>
          h(
            Admin,
            {
              dataProvider: fakeDataProvider({}),
              registry: opts.registry,
              queryClient: new QueryClient({
                defaultOptions: {
                  queries: { retry: false },
                  mutations: { retry: false },
                },
              }),
              i18n: createI18n({
                locale: "en",
                messages: {
                  en: defineMessages({
                    "chelone.auth.sign_in": "Sign in",
                    "chelone.auth.sign_in_error":
                      "Authentication failed, please retry",
                    "chelone.validation.required": "Required",
                  }),
                },
              }),
              notifications: opts.notifications ?? createNotificationStore(),
              authProvider: opts.authProvider,
            },
            { default: () => h(LoginWithEmail, props) },
          );
      },
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
}

const emailInput = (wrapper: VueWrapper) =>
  wrapper.get<HTMLInputElement>("input[type=email]");
const passwordInput = (wrapper: VueWrapper) =>
  wrapper.get<HTMLInputElement>("input[type=password]");
const submitButton = (wrapper: VueWrapper) =>
  wrapper.get<HTMLButtonElement>("button[type=submit]");

async function fillAndSubmit(
  wrapper: VueWrapper,
  email: string,
  password: string,
) {
  await emailInput(wrapper).setValue(email);
  await passwordInput(wrapper).setValue(password);
  await submitButton(wrapper).trigger("click");
  await flushPromises();
}

/**
 * A store that records what is notified. The shell's `<Notification>` drains
 * the store as it shows each toast, so a snapshot would come back empty.
 */
function makeRecordingStore() {
  const notifications = createNotificationStore();
  const notify = vi.spyOn(notifications, "notify");
  const errors = () =>
    notify.mock.calls
      .filter(([, options]) => options?.type === "error")
      .map(([message]) => message);
  return { notifications, errors };
}

describe("<LoginWithEmail>", () => {
  it("renders the email and password fields and the sign in button", async () => {
    const wrapper = mountLogin({}, { authProvider: makeAuthProvider() });
    await flushPromises();

    const labels = wrapper.findAll("label").map((label) => label.text());
    expect(labels).toEqual(["Email *", "Password *"]);
    expect(emailInput(wrapper).element.type).toBe("email");
    expect(passwordInput(wrapper).element.type).toBe("password");
    expect(submitButton(wrapper).text()).toBe("Sign in");
  });

  it("calls authProvider.login with the credentials and redirectTo", async () => {
    const login = vi.fn(async () => {});
    const wrapper = mountLogin(
      { redirectTo: "/dashboard" },
      { authProvider: makeAuthProvider({ login }) },
    );
    await flushPromises();
    await fillAndSubmit(wrapper, "user@example.com", "hunter2");

    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
      redirectTo: "/dashboard",
    });
  });

  it("calls onSubmit with the credentials instead of authProvider.login", async () => {
    const login = vi.fn(async () => {});
    const onSubmit = vi.fn(async () => {});
    const wrapper = mountLogin(
      { onSubmit, redirectTo: "/dashboard" },
      { authProvider: makeAuthProvider({ login }) },
    );
    await flushPromises();
    await fillAndSubmit(wrapper, "user@example.com", "hunter2");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
    });
    expect(login).not.toHaveBeenCalled();
  });

  it("renders and submits through onSubmit when there is no authProvider", async () => {
    const onSubmit = vi.fn(async () => {});
    const wrapper = mountLogin({ onSubmit });
    await flushPromises();
    await fillAndSubmit(wrapper, "user@example.com", "hunter2");

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
    });
  });

  it("ignores an ambient resource schema: credentials are not a post", async () => {
    const onSubmit = vi.fn(async () => {});
    const { notifications, errors } = makeRecordingStore();
    const wrapper = mountLogin(
      { onSubmit },
      {
        authProvider: makeAuthProvider(),
        notifications,
        registry: postsRegistry,
        resource: "posts",
      },
    );
    await flushPromises();
    await fillAndSubmit(wrapper, "user@example.com", "hunter2");

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "hunter2",
    });
    expect(errors()).toEqual([]);
  });

  it("notifies an error when login rejects", async () => {
    const { notifications, errors } = makeRecordingStore();
    const login = vi.fn(async () => {
      throw new Error("bad creds");
    });
    const wrapper = mountLogin(
      {},
      { authProvider: makeAuthProvider({ login }), notifications },
    );
    await flushPromises();
    await fillAndSubmit(wrapper, "user@example.com", "wrong");

    expect(errors()).toEqual(["bad creds"]);
  });

  it("notifies an error when onSubmit rejects", async () => {
    const { notifications, errors } = makeRecordingStore();
    const onSubmit = vi.fn(async () => {
      throw new Error("backend down");
    });
    const wrapper = mountLogin(
      { onSubmit },
      { authProvider: makeAuthProvider(), notifications },
    );
    await flushPromises();
    await fillAndSubmit(wrapper, "user@example.com", "hunter2");

    expect(errors()).toEqual(["backend down"]);
  });

  it("falls back to chelone.auth.sign_in_error when the rejection has no message", async () => {
    const { notifications, errors } = makeRecordingStore();
    const onSubmit = vi.fn(async () => {
      throw new Error("");
    });
    const wrapper = mountLogin(
      { onSubmit },
      { authProvider: makeAuthProvider(), notifications },
    );
    await flushPromises();
    await fillAndSubmit(wrapper, "user@example.com", "hunter2");

    expect(errors()).toEqual(["chelone.auth.sign_in_error"]);
  });

  it("blocks a submit with an empty email or password", async () => {
    const onSubmit = vi.fn(async () => {});
    const wrapper = mountLogin(
      { onSubmit },
      { authProvider: makeAuthProvider() },
    );
    await flushPromises();

    await submitButton(wrapper).trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Required");
    expect(onSubmit).not.toHaveBeenCalled();

    await emailInput(wrapper).setValue("user@example.com");
    await submitButton(wrapper).trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Required");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the button while the loading prop is true", async () => {
    const wrapper = mountLogin(
      { loading: true },
      { authProvider: makeAuthProvider() },
    );
    await flushPromises();

    const button = submitButton(wrapper);
    expect(button.element.disabled).toBe(true);
    expect(button.find('[role="status"]').exists()).toBe(true);
  });

  it("disables the button while an onSubmit handler runs", async () => {
    let finish: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const wrapper = mountLogin(
      { onSubmit },
      { authProvider: makeAuthProvider() },
    );
    await flushPromises();
    await fillAndSubmit(wrapper, "user@example.com", "hunter2");

    expect(submitButton(wrapper).element.disabled).toBe(true);
    expect(submitButton(wrapper).find('[role="status"]').exists()).toBe(true);

    finish();
    await flushPromises();
    expect(submitButton(wrapper).element.disabled).toBe(false);
  });

  it("uses submitLabel for the button text", async () => {
    const wrapper = mountLogin(
      { submitLabel: "Continue" },
      { authProvider: makeAuthProvider() },
    );
    await flushPromises();

    expect(submitButton(wrapper).text()).toBe("Continue");
  });
});
