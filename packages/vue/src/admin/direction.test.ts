/**
 * `<Admin>` sets the app root's writing direction from the active locale: `dir`
 * on `<html>`, so a right-to-left locale such as Arabic renders right to left,
 * and back to `ltr` when the app switches. The Vue twin of
 * `@chelone/react`'s `<Admin>` direction test.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, type VNode } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import Admin from "./admin.vue";

const dataProvider = fakeDataProvider({});

const messages = {
  en: defineMessages({ "demo.title": "Posts" }),
  ar: defineMessages({ "demo.title": "منشورات" }),
};

const Blank = defineComponent({
  setup: () => () => h("div", "blank"),
});

/** A plain chrome, so the test mounts no sidebar. */
function layout(): VNode[] {
  return [h("div", { "data-testid": "layout" }, "shell")];
}

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
}

function dirOfRoot(): string | null {
  return document.documentElement.getAttribute("dir");
}

afterEach(() => {
  document.documentElement.removeAttribute("dir");
});

describe("<Admin> — dir from the locale", () => {
  it("sets dir=ltr on the root for an English locale", async () => {
    mount(Admin, {
      props: { dataProvider, i18n: createI18n({ locale: "en", messages }) },
      slots: { layout },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();

    expect(dirOfRoot()).toBe("ltr");
  });

  it("sets dir=rtl on the root when the locale switches to Arabic, and back to ltr", async () => {
    const i18n = createI18n({ locale: "en", messages });
    mount(Admin, {
      props: { dataProvider, i18n },
      slots: { layout },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();
    expect(dirOfRoot()).toBe("ltr");

    i18n.setLocale("ar");
    await nextTick();
    expect(dirOfRoot()).toBe("rtl");

    i18n.setLocale("en");
    await nextTick();
    expect(dirOfRoot()).toBe("ltr");
  });

  it("mounts with dir=rtl when the app starts on a right-to-left locale", async () => {
    mount(Admin, {
      props: { dataProvider, i18n: createI18n({ locale: "ar", messages }) },
      slots: { layout },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();

    expect(dirOfRoot()).toBe("rtl");
  });

  it("sets dir=ltr when <Admin> builds its own English i18n", async () => {
    mount(Admin, {
      props: { dataProvider },
      slots: { layout },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();

    expect(dirOfRoot()).toBe("ltr");
  });

  it("puts back the dir the host set when <Admin> unmounts", async () => {
    document.documentElement.setAttribute("dir", "rtl");
    const wrapper = mount(Admin, {
      props: { dataProvider, i18n: createI18n({ locale: "en", messages }) },
      slots: { layout },
      global: { plugins: [makeRouter()] },
    });
    await flushPromises();
    expect(dirOfRoot()).toBe("ltr");

    wrapper.unmount();
    expect(dirOfRoot()).toBe("rtl");
  });
});
