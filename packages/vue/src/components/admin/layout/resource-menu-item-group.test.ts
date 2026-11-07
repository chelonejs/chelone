/**
 * `<ResourceMenuItemGroup>` takes a default slot: extra entries after the
 * resources, inside the group. The React twin's children collapse with the
 * group; the Vue group is not collapsible yet.
 */

import { fakeDataProvider } from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { SidebarProvider } from "../../ui/sidebar";
import ResourceMenuItemGroup from "./resource-menu-item-group.vue";

const Blank = defineComponent({ setup: () => () => h("div", "blank") });

function mountGroup(resources: string[]) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: Blank }],
  });
  const wrapper = mount(Admin, {
    props: { dataProvider: fakeDataProvider({}) },
    slots: {
      default: () => [
        h(Resource, { name: "posts", list: Blank }),
        h(Resource, { name: "authors", list: Blank }),
      ],
      layout: () => [
        h(SidebarProvider, () =>
          h(
            ResourceMenuItemGroup,
            { label: "Content", resources },
            { default: () => h("li", "Landing page") },
          ),
        ),
      ],
    },
    global: { plugins: [router] },
  });
  return wrapper;
}

describe("<ResourceMenuItemGroup> slot", () => {
  it("renders the slot after the resource entries", async () => {
    const wrapper = mountGroup(["posts"]);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain("Content");
    expect(text.indexOf("Posts")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Landing page")).toBeGreaterThan(text.indexOf("Posts"));
  });

  it("renders the slot in a group that has no resources", async () => {
    const wrapper = mountGroup([]);
    await flushPromises();
    expect(wrapper.text()).toContain("Landing page");
  });
});
