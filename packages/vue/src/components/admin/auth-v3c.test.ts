/**
 * V3-c Task 1 gate probes for the auth page surface. `<LoginForm>` submits the
 * entered credentials to the fake `authProvider.login` (and surfaces a rejected
 * login through the notification store); `<LoginPage>` redirects an
 * already-authenticated user to `/`; `<AccessDenied>` / `<AuthenticationError>`
 * / `<AuthError>` render their translated messages (and `<AuthError>` links to
 * `/login`); `<AuthCallback>` drives `authProvider.handleCallback` (redirecting
 * on success, rendering `<AuthError>` on failure); `<Admin requireAuth>` gates
 * the shell (login page when unauthenticated, layout once authenticated). All
 * mounted under a real `<Admin>` + vue-router, mirroring the V3-b harness.
 */

import type { AuthProvider } from "@chelone/core";
import {
  createNotificationStore,
  fakeDataProvider,
  type NotificationStore,
} from "@chelone/core";
import { defined } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "../../admin/admin.vue";
import AccessDenied from "./auth/access-denied.vue";
import AuthCallback from "./auth/auth-callback.vue";
import AuthError from "./auth/auth-error.vue";
import AuthLayout from "./auth/auth-layout.vue";
import AuthenticationError from "./auth/authentication-error.vue";
import LoginForm from "./auth/login-form.vue";
import LoginPage from "./auth/login-page.vue";

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    ...over,
  };
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/login", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", component: { render: () => null } },
    ],
  });
}

interface MountOpts {
  authProvider?: AuthProvider;
  notifications?: NotificationStore;
  router?: Router;
}

function mountAdmin(render: () => VNodeChild, opts: MountOpts = {}) {
  const router = opts.router ?? makeRouter();
  const dataProvider = fakeDataProvider({});
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider,
            queryClient,
            authProvider: opts.authProvider,
            notifications: opts.notifications,
          },
          { default: render },
        );
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, router, queryClient };
}

describe("<LoginForm>", () => {
  it("renders the email + password fields and a submit button", () => {
    const { wrapper } = mountAdmin(() => h(LoginForm), {
      authProvider: makeAuthProvider(),
    });
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it("submits the entered credentials to authProvider.login", async () => {
    const login = vi.fn<AuthProvider["login"]>(async () => {});
    const { wrapper } = mountAdmin(() => h(LoginForm), {
      authProvider: makeAuthProvider({ login }),
    });

    await wrapper.find('input[type="email"]').setValue("user@example.com");
    await wrapper.find('input[type="password"]').setValue("s3cret");
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    const [params] = defined(login.mock.calls[0]);
    expect(params).toMatchObject({
      email: "user@example.com",
      password: "s3cret",
    });
  });

  it("forwards redirectTo to authProvider.login", async () => {
    const login = vi.fn<AuthProvider["login"]>(async () => {});
    const { wrapper } = mountAdmin(
      () => h(LoginForm, { redirectTo: "/dashboard" }),
      { authProvider: makeAuthProvider({ login }) },
    );

    await wrapper.find('input[type="email"]').setValue("a@b.c");
    await wrapper.find('input[type="password"]').setValue("pw");
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    const [params] = defined(login.mock.calls[0]);
    expect(params).toMatchObject({ redirectTo: "/dashboard" });
  });

  it("pushes an error notification when the login rejects", async () => {
    const notifications = createNotificationStore();
    // The default layout's <Notification> drains the store, so watch the push.
    const notify = vi.spyOn(notifications, "notify");
    const login = vi.fn(async () => {
      throw new Error("bad credentials");
    });
    const { wrapper } = mountAdmin(() => h(LoginForm), {
      authProvider: makeAuthProvider({ login }),
      notifications,
    });

    await wrapper.find('input[type="email"]').setValue("a@b.c");
    await wrapper.find('input[type="password"]').setValue("pw");
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    const [message, options] = defined(notify.mock.calls[0]);
    expect(message).toBe("bad credentials");
    expect(defined(options)).toMatchObject({ type: "error" });
  });
});

describe("<LoginPage>", () => {
  it("redirects an already-authenticated user to /", async () => {
    const router = makeRouter();
    await router.push("/login");
    mountAdmin(() => h(LoginPage), {
      authProvider: makeAuthProvider({ checkAuth: async () => {} }),
      router,
    });

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe("/"));
  });

  it("stays on the login page while unauthenticated", async () => {
    const router = makeRouter();
    await router.push("/login");
    mountAdmin(() => h(LoginPage), {
      authProvider: makeAuthProvider({
        checkAuth: async () => {
          throw new Error("nope");
        },
      }),
      router,
    });

    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/login");
  });
});

describe("<LoginPage> notifications", () => {
  it("<LoginPage> shows a failed sign-in as a toast", async () => {
    const notifications = createNotificationStore();
    const { wrapper } = mountAdmin(() => h(LoginPage), {
      authProvider: makeAuthProvider({
        checkAuth: async () => {
          throw new Error("nope");
        },
        login: async () => {
          throw new Error("bad credentials");
        },
      }),
      notifications,
    });
    await flushPromises();

    await wrapper.find('input[type="email"]').setValue("a@b.c");
    await wrapper.find('input[type="password"]').setValue("pw");
    await wrapper.find("form").trigger("submit");

    await vi.waitFor(() =>
      expect(wrapper.find('[data-slot="notification-toast"]').text()).toContain(
        "bad credentials",
      ),
    );
  });

  it("<AuthLayout> renders its #notification slot in place of the default toast region", () => {
    // A custom #layout keeps the default shell's own <Notification> out of the DOM.
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}) },
      slots: {
        default: () =>
          h(
            AuthLayout,
            {},
            {
              default: () => h("p", "form"),
              notification: () => h("div", { "data-test": "custom-sink" }),
            },
          ),
        layout: () => h("div", "custom shell"),
      },
      global: { plugins: [makeRouter()] },
    });

    expect(wrapper.find('[data-test="custom-sink"]').exists()).toBe(true);
    expect(wrapper.find('[data-slot="notification"]').exists()).toBe(false);
  });
});

describe("error pages", () => {
  it("<AccessDenied> renders the translated primary + secondary text", () => {
    const { wrapper } = mountAdmin(() => h(AccessDenied));
    expect(wrapper.text()).toContain("Access denied");
    expect(wrapper.text()).toContain("You don't have the right permissions");
  });

  it("<AuthenticationError> renders the authentication-error text", () => {
    const { wrapper } = mountAdmin(() => h(AuthenticationError));
    expect(wrapper.text()).toContain("Authentication error");
    expect(wrapper.text()).toContain("credentials could not be checked");
  });

  it("<AuthError> renders an alert heading and links to /login", () => {
    const { wrapper } = mountAdmin(() => h(AuthError));
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    const link = wrapper.find('[data-slot="auth-error-signin"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/login");
  });
});

describe("<AuthCallback>", () => {
  it("redirects to the provider's redirectTo on success", async () => {
    const router = makeRouter();
    await router.push("/login");
    const handleCallback = vi.fn(async () => ({ redirectTo: "/welcome" }));
    mountAdmin(() => h(AuthCallback), {
      authProvider: makeAuthProvider({ handleCallback }),
      router,
    });

    await vi.waitFor(() => expect(handleCallback).toHaveBeenCalledTimes(1));
    await vi.waitFor(() =>
      expect(router.currentRoute.value.path).toBe("/welcome"),
    );
  });

  it("renders <AuthError> when the callback rejects", async () => {
    const handleCallback = vi.fn(async () => {
      throw new Error("oauth exploded");
    });
    const { wrapper } = mountAdmin(() => h(AuthCallback), {
      authProvider: makeAuthProvider({ handleCallback }),
    });

    await vi.waitFor(() =>
      expect(wrapper.find('[role="alert"]').exists()).toBe(true),
    );
    expect(wrapper.text()).toContain("oauth exploded");
  });
});

describe("<Admin requireAuth>", () => {
  it("shows the login page while unauthenticated, then the layout once authenticated", async () => {
    let allow = false;
    const authProvider = makeAuthProvider({
      checkAuth: async () => {
        if (!allow) throw new Error("unauthenticated");
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = makeRouter();
    const dataProvider = fakeDataProvider({});
    const Harness = defineComponent({
      setup() {
        return () =>
          h(Admin, {
            dataProvider,
            queryClient,
            authProvider,
            requireAuth: true,
          });
      },
    });
    const wrapper = mount(Harness, { global: { plugins: [router] } });

    // Unauthenticated → the login form is shown, the sidebar layout is not.
    await vi.waitFor(() =>
      expect(wrapper.find('input[type="password"]').exists()).toBe(true),
    );

    // Flip auth on and refetch → the login page yields to the shell layout.
    allow = true;
    await queryClient.invalidateQueries();
    await vi.waitFor(() =>
      expect(wrapper.find('input[type="password"]').exists()).toBe(false),
    );
  });
});
