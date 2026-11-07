/**
 * `<MenuItemLink keyboardShortcut>` — the Vue twin of the React link's shortcut:
 * the keys show after the label, and pressing them navigates to `to`.
 */

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { makeCheloneContext } from "../../../__fixtures__/chelone-context";
import { CheloneContextKey } from "../../../context";
import { provideVueRouterAdapter } from "../../../router/vue-router-adapter";
import MenuItemLink from "./menu-item-link.vue";

const Blank = defineComponent({ setup: () => () => h("div", "blank") });

const Host = defineComponent({
  setup(_props, { slots }) {
    provideVueRouterAdapter();
    return () => slots.default?.();
  },
});

function mountLink(router: Router, keyboardShortcut?: string) {
  return mount(Host, {
    slots: {
      default: () =>
        h(MenuItemLink, { to: "/team", label: "Team", keyboardShortcut }),
    },
    attachTo: document.body,
    global: {
      plugins: [router],
      provide: { [CheloneContextKey]: makeCheloneContext() },
    },
  });
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: Blank },
      { path: "/team", component: Blank },
    ],
  });
}

function press(init: KeyboardEventInit) {
  window.dispatchEvent(new KeyboardEvent("keydown", init));
}

describe("<MenuItemLink> keyboardShortcut", () => {
  it("shows the keys after the label", async () => {
    const wrapper = mountLink(makeRouter(), "mod+1");
    await flushPromises();

    expect(wrapper.find("a").text()).toBe("Team⌘1");
    wrapper.unmount();
  });

  it("shows no keys without a shortcut", async () => {
    const wrapper = mountLink(makeRouter());
    await flushPromises();

    expect(wrapper.find("kbd").exists()).toBe(false);
    wrapper.unmount();
  });

  it("navigates when the keys are pressed", async () => {
    const router = makeRouter();
    const wrapper = mountLink(router, "mod+1");
    await router.push("/");
    await flushPromises();

    press({ key: "1", ctrlKey: true });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/team");
    wrapper.unmount();
  });

  it("ignores other keys", async () => {
    const router = makeRouter();
    const wrapper = mountLink(router, "mod+1");
    await router.push("/");
    await flushPromises();

    press({ key: "2", ctrlKey: true });
    press({ key: "1" });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/");
    wrapper.unmount();
  });

  it("stops listening once the link unmounts", async () => {
    const router = makeRouter();
    const wrapper = mountLink(router, "mod+1");
    await router.push("/");
    await flushPromises();
    wrapper.unmount();

    press({ key: "1", ctrlKey: true });
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/");
  });
});
