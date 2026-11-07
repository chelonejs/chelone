import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { useResourceContext } from "../resource-context";
import Admin from "./admin.vue";
import Resource from "./resource.vue";

/** A view that reads the ambient resource, as a guesser does. */
const WhichResource = defineComponent({
  setup: () => () =>
    h("div", { "data-testid": "view" }, useResourceContext() ?? "no resource"),
});

async function viewAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes: [] });
  await router.push(path);
  const wrapper = mount(Admin, {
    props: {
      dataProvider: fakeDataProvider({}),
      queryClient: new QueryClient(),
    },
    slots: {
      default: () => [
        h(Resource, {
          name: "tags",
          list: WhichResource,
          create: WhichResource,
          edit: WhichResource,
          show: WhichResource,
        }),
      ],
    },
    global: { plugins: [router] },
  });
  await vi.waitFor(() =>
    expect(wrapper.find("[data-testid=view]").exists()).toBe(true),
  );
  return wrapper.get("[data-testid=view]").text();
}

describe("<Admin> resource views", () => {
  it.each([
    ["list", "/tags"],
    ["create", "/tags/create"],
    ["show", "/tags/3/show"],
    ["edit", "/tags/3"],
  ])("the %s view reads its resource from context", async (_view, path) => {
    expect(await viewAt(path)).toBe("tags");
  });
});
