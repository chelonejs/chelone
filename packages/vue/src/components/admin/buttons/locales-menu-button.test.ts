/**
 * `<LocalesMenuButton>` — the app-bar menu that switches the interface
 * language. Mounted as the `#layout` of a real `<Admin>` with a real i18n
 * instance, so it reads the ambient context the way it does in an app.
 */

import {
  type AnyCheloneI18n,
  createI18n,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import LocalesMenuButton from "./locales-menu-button.vue";

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

function makeI18n(locales: string[], changeLocale?: string): AnyCheloneI18n {
  const messages = Object.fromEntries(
    locales.map((code) => [
      code,
      defineMessages(
        changeLocale && code === "en"
          ? { "chelone.action.change_locale": changeLocale }
          : {},
      ),
    ]),
  );
  return createI18n({
    locale: locales[0] ?? "en",
    messages,
  });
}

function mountButton(
  i18n: AnyCheloneI18n | undefined,
  button: () => VNodeChild = () => h(LocalesMenuButton),
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  wrapper = mount(Admin, {
    props: { dataProvider: fakeDataProvider({}), i18n },
    slots: { layout: () => h("div", { id: "host" }, [button()]) },
    global: { plugins: [router] },
  });
  return wrapper;
}

const trigger = (w: VueWrapper, name = "Change locale") =>
  w.get(`button[aria-label="${name}"]`);

async function openMenu(w: VueWrapper, name?: string) {
  await trigger(w, name).trigger("click");
  await flushPromises();
}

const itemTexts = (w: VueWrapper) =>
  w.findAll('[role="menuitem"]').map((item) => item.text());

describe("<LocalesMenuButton>", () => {
  it("renders nothing with one locale", () => {
    const w = mountButton(makeI18n(["en"]));
    expect(w.get("#host").element.children).toHaveLength(0);
  });

  it("renders nothing without an i18n instance", () => {
    const w = mountButton(undefined);
    expect(w.get("#host").element.children).toHaveLength(0);
  });

  it("opens a menu of each language", async () => {
    const w = mountButton(makeI18n(["en", "fr", "de"]));
    expect(w.findAll('[role="menuitem"]')).toHaveLength(0);

    await openMenu(w);

    expect(itemTexts(w)).toEqual(["English", "français", "Deutsch"]);
  });

  it("checks the current language", async () => {
    const w = mountButton(makeI18n(["en", "fr"]));
    await openMenu(w);

    const [english, french] = w.findAll('[role="menuitem"]');
    expect(english?.find("svg").exists()).toBe(true);
    expect(french?.find("svg").exists()).toBe(false);
  });

  it("choosing a language switches the locale", async () => {
    const i18n = makeI18n(["en", "fr"]);
    const w = mountButton(i18n);
    expect(trigger(w).text()).toBe("EN");
    await openMenu(w);

    await w.findAll('[role="menuitem"]')[1]?.trigger("click");
    await flushPromises();

    expect(i18n.getLocale()).toBe("fr");
    expect(trigger(w).text()).toBe("FR");
  });

  it("shows the icon slot instead of the locale code", () => {
    const w = mountButton(makeI18n(["en", "fr"]), () =>
      h(LocalesMenuButton, null, {
        icon: () => h("svg", { "data-testid": "globe" }),
      }),
    );
    expect(w.find('[data-testid="globe"]').exists()).toBe(true);
    expect(trigger(w).text()).toBe("");
  });

  it("lists the languages prop instead of the i18n locales", async () => {
    const w = mountButton(makeI18n(["en", "fr"]), () =>
      h(LocalesMenuButton, {
        languages: [
          { locale: "en", name: "English (UK)" },
          { locale: "fr", name: "Français (CA)" },
        ],
      }),
    );
    await openMenu(w);

    expect(itemTexts(w)).toEqual(["English (UK)", "Français (CA)"]);
  });

  it("labels the trigger with the translated change locale text", () => {
    const w = mountButton(makeI18n(["en", "fr"], "Switch language"));
    expect(trigger(w, "Switch language").element.tagName).toBe("BUTTON");
  });

  it("renders nothing without an i18n instance even with the languages prop", () => {
    const w = mountButton(undefined, () =>
      h(LocalesMenuButton, {
        languages: [
          { locale: "en", name: "English" },
          { locale: "fr", name: "Français" },
        ],
      }),
    );
    expect(w.get("#host").element.children).toHaveLength(0);
  });

  it("leaves out a language the i18n has no catalog for", () => {
    const w = mountButton(makeI18n(["en", "fr"]), () =>
      h(LocalesMenuButton, {
        languages: [
          { locale: "en", name: "English" },
          { locale: "en-GB", name: "English (UK)" },
        ],
      }),
    );
    expect(w.get("#host").element.children).toHaveLength(0);
  });
});
