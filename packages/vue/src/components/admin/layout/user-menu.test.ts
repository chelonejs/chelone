/**
 * V3-a Task 3 contract — `<UserMenu>` + `<Logout>`. The Vue twin of
 * `@chelone/react`'s `layout/user-menu.test.tsx`. Asserts: nothing renders
 * without an `authProvider`; the identity's name surfaces via the trigger's
 * aria-label; and clicking the logout item calls the authProvider's `logout`.
 */

import { type AuthProvider, fakeDataProvider } from "@chelone/core";
import { QueryClient, VUE_QUERY_CLIENT } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, provide } from "vue";
import { CheloneContextKey } from "../../../context";
import UserMenu from "./user-menu.vue";

const dataProvider = fakeDataProvider({});

function makeAuthProvider(over: Partial<AuthProvider> = {}): AuthProvider {
  return {
    login: async () => {},
    logout: async () => {},
    checkAuth: async () => {},
    checkError: async () => {},
    getIdentity: async () => ({ id: 1, fullName: "Rin", avatar: undefined }),
    ...over,
  };
}

/** Mount `<UserMenu>` under a Chelone context + a mounted vue-query client. */
function mountUserMenu(authProvider?: AuthProvider): VueWrapper {
  return mount(
    defineComponent({
      setup() {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false } },
        });
        queryClient.mount();
        provide(VUE_QUERY_CLIENT, queryClient);
        provide(CheloneContextKey, { dataProvider, queryClient, authProvider });
        return () => h(UserMenu);
      },
    }),
    { attachTo: document.body },
  );
}

/** Poll `predicate`, flushing pending promises/microtasks between attempts. */
async function until(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 50; i += 1) {
    if (predicate()) return;
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("until: condition never became true");
}

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("<UserMenu>", () => {
  it("renders nothing when no authProvider is configured", async () => {
    wrapper = mountUserMenu(undefined);
    await flushPromises();
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("shows the identity's name via the trigger aria-label", async () => {
    wrapper = mountUserMenu(makeAuthProvider());
    await until(
      () => wrapper?.find('button[aria-label="Rin"]').exists() ?? false,
    );
    expect(wrapper.find('button[aria-label="Rin"]').exists()).toBe(true);
  });

  it("logs out via the authProvider when the logout item is clicked", async () => {
    const logout = vi.fn(async () => {});
    wrapper = mountUserMenu(makeAuthProvider({ logout }));
    // Wait for the identity to resolve, then open the dropdown.
    await until(
      () => wrapper?.find('button[aria-label="Rin"]').exists() ?? false,
    );
    await wrapper.get('[data-slot="dropdown-menu-trigger"]').trigger("click");
    // Wait for the auth state to resolve so <Logout> renders its item.
    await until(
      () => wrapper?.find('[data-slot="dropdown-menu-item"]').exists() ?? false,
    );
    await wrapper.get('[data-slot="dropdown-menu-item"]').trigger("click");
    await flushPromises();
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
