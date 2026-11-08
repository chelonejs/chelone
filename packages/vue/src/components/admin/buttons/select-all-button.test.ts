/**
 * Tests: `<SelectAllButton>` labels — the Vue twin of the React test. A real
 * `<Admin>` + `<List>` over a `fakeDataProvider` keeps the `ListContext` live,
 * and every row of the page is selected so the button is visible. Pins the three
 * label paths: a literal label renders as written, the default key falls back to
 * "Select all", and a registered key renders its translation.
 */

import {
  createI18n,
  defineMessages,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import {
  type ListContextValue,
  useListContext,
} from "../../../list/list-context";
import List from "../view/list.vue";
import SelectAllButton from "./select-all-button.vue";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string() }),
  },
});
type Resources = typeof resources;

const seed = [
  { id: 1, title: "One" },
  { id: 2, title: "Two" },
  { id: 3, title: "Three" },
  { id: 4, title: "Four" },
  { id: 5, title: "Five" },
];

/** Which of `messages` a mount registers; an empty object registers none. */
const messages = {
  "chelone.action.select_all": "Take the whole list",
  "app.pick_all": "Every row on this page",
};

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", component: { render: () => null } },
    ],
  });
}

type Capture = { list?: ListContextValue };

function mountList(
  buttons: () => VNodeChild[],
  {
    registered = {},
    perPage = 2,
  }: { registered?: Record<string, string>; perPage?: number } = {},
) {
  const capture: Capture = {};
  const probe = defineComponent({
    setup() {
      capture.list = useListContext();
      return () => null;
    },
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider<Resources>({
              posts: structuredClone(seed),
            }),
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
            i18n: createI18n({
              locale: "en",
              messages: { en: defineMessages(registered) },
            }),
          },
          {
            default: () =>
              h(
                List,
                { resource: "posts", perPage },
                { default: () => [h(probe), ...buttons()] },
              ),
          },
        );
    },
  });
  const mounted = mount(Harness, { global: { plugins: [makeRouter()] } });
  wrapper = mounted;
  return { wrapper: mounted, capture };
}

/** Select every row of the page so the button becomes visible. */
async function showButton(
  mounted: VueWrapper,
  capture: Capture,
  ids: number[],
) {
  await vi.waitFor(() => expect(capture.list?.isPending).toBe(false));
  capture.list?.select(ids);
  return vi.waitFor(() => {
    const button = mounted.find('[data-slot="select-all-button"]');
    expect(button.exists()).toBe(true);
    return button;
  });
}

describe("<SelectAllButton>", () => {
  it("renders a literal label as given", async () => {
    const { wrapper: mounted, capture } = mountList(() => [
      h(SelectAllButton, { label: "Pick every row" }),
    ]);
    const button = await showButton(mounted, capture, [1, 2]);
    expect(button.text()).toBe("Pick every row");
  });

  it("falls back to 'Select all' for the default key with no catalog entry", async () => {
    const { wrapper: mounted, capture } = mountList(() => [h(SelectAllButton)]);
    const button = await showButton(mounted, capture, [1, 2]);
    expect(button.text()).toBe("Select all");
  });

  it("renders the translation of a registered key", async () => {
    const { wrapper: mounted, capture } = mountList(
      () => [h(SelectAllButton), h(SelectAllButton, { label: "app.pick_all" })],
      { registered: messages },
    );
    await vi.waitFor(() => expect(capture.list?.isPending).toBe(false));
    capture.list?.select([1, 2]);
    const buttons = await vi.waitFor(() => {
      const found = mounted.findAll('[data-slot="select-all-button"]');
      expect(found.length).toBe(2);
      return found;
    });
    expect(buttons[0]?.text()).toBe("Take the whole list");
    expect(buttons[1]?.text()).toBe("Every row on this page");
  });
});
