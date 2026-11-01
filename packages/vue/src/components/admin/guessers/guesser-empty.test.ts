/**
 * `<GuesserEmpty>` tests: the empty state a guesser shows for a resource with
 * no registered schema. Mounted under `<Admin>`, asserting the DOM.
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import GuesserEmpty, { type GuesserEmptyProps } from "./guesser-empty.vue";

async function mountEmpty(
  props: GuesserEmptyProps = {},
  slots: Record<string, () => VNodeChild> = {},
  messages: Record<string, string> = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
            i18n: createI18n({
              locale: "en",
              messages: { en: defineMessages(messages) },
            }),
          },
          { default: () => h(GuesserEmpty, props, slots) },
        ),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return wrapper;
}

describe("GuesserEmpty", () => {
  it("shows the no-schema title and message with the resource name", async () => {
    const wrapper = await mountEmpty({ resource: "posts" });

    expect(wrapper.get("h2").text()).toBe("No schema registered");
    expect(wrapper.get("p").text()).toBe(
      "Register a Zod schema for posts with defineResources so this page can be generated.",
    );
    expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
  });

  it("translates the default title and message", async () => {
    const wrapper = await mountEmpty(
      { resource: "posts" },
      {},
      {
        "chelone.guesser.no_schema.title": "Aucun schéma",
        "chelone.guesser.no_schema.message":
          "Enregistrez un schéma pour {resource}",
      },
    );

    expect(wrapper.get("h2").text()).toBe("Aucun schéma");
    expect(wrapper.get("p").text()).toBe("Enregistrez un schéma pour posts");
  });

  it("translates a custom title and message string", async () => {
    const wrapper = await mountEmpty(
      { title: "my.title", message: "Nothing to see" },
      {},
      { "my.title": "Mon titre" },
    );

    expect(wrapper.get("h2").text()).toBe("Mon titre");
    expect(wrapper.get("p").text()).toBe("Nothing to see");
  });

  it("renders the title and message slots over the props", async () => {
    const wrapper = await mountEmpty(
      { title: "From props", message: "From props too", resource: "posts" },
      {
        title: () => h("em", "Slot title"),
        message: () => h("strong", "Slot message"),
      },
    );

    expect(wrapper.get("h2 em").text()).toBe("Slot title");
    expect(wrapper.get("p strong").text()).toBe("Slot message");
    expect(wrapper.text()).not.toContain("From props");
  });
});
