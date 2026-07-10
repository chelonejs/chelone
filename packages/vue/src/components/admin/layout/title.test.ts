/**
 * V3-a Task 3 contract — `<Title>` + `<TitlePortal>`. The Vue twin of
 * `@chelone/react`'s `layout/title.test.tsx`. Asserts: `<Title>` renders nothing
 * without a portal target; teleports the translated string into `<TitlePortal>`
 * when present; and renders a custom slot node verbatim (the Vue idiom replacing
 * the React twin's VNode `title` prop). The round-trip proves the Teleport-based
 * portal mechanism carries a view's title into the app-bar slot.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, provide } from "vue";
import { CheloneContextKey, type CheloneContextValue } from "../../../context";
import Title from "./title.vue";
import TitlePortal from "./title-portal.vue";
import { TITLE_PORTAL_ID } from "./title-portal-id";

function makeContext(): CheloneContextValue {
  return {
    dataProvider: fakeDataProvider({}),
    queryClient: new QueryClient(),
    i18n: createI18n({
      locale: "en",
      messages: { en: defineMessages({ "page.dashboard": "Dashboard" }) },
    }),
  };
}

/** Mount `render()` under a Chelone context, attached to the document (Teleport needs a live DOM). */
function mountWithContext(render: () => unknown): VueWrapper {
  return mount(
    defineComponent({
      setup() {
        provide(CheloneContextKey, makeContext());
        return render;
      },
    }),
    { attachTo: document.body },
  );
}

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
});

describe("<Title> / <TitlePortal>", () => {
  it("renders nothing when there is no portal target", async () => {
    wrapper = mountWithContext(() => h(Title, { title: "page.dashboard" }));
    await flushPromises();
    expect(wrapper.text()).toBe("");
    expect(document.getElementById(TITLE_PORTAL_ID)).toBeNull();
  });

  it("teleports the translated title into the portal", async () => {
    wrapper = mountWithContext(() =>
      h("div", [h(TitlePortal), h(Title, { title: "page.dashboard" })]),
    );
    await flushPromises();
    const portal = document.getElementById(TITLE_PORTAL_ID);
    expect(portal).not.toBeNull();
    expect(portal?.textContent).toContain("Dashboard");
  });

  it("renders a custom slot node verbatim", async () => {
    wrapper = mountWithContext(() =>
      h("div", [
        h(TitlePortal),
        h(Title, null, { default: () => h("span", "Custom") }),
      ]),
    );
    await flushPromises();
    const portal = document.getElementById(TITLE_PORTAL_ID);
    expect(portal?.textContent).toContain("Custom");
  });
});
