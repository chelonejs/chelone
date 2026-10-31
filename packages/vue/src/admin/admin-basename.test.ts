import { fakeDataProvider } from "@chelone/core";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "./admin.vue";
import Resource from "./resource.vue";

enableAutoUnmount(afterEach);

const Posts = defineComponent({
  setup: () => () => h("div", { "data-testid": "posts" }, "posts list"),
});
const Blank = defineComponent({ setup: () => () => h("div") });

function makeRouter() {
  return createRouter({
    history: createMemoryHistory("/app"),
    routes: [
      { path: "/", component: Blank },
      { path: "/admin", component: Blank },
      { path: "/outside", component: Blank },
    ],
  });
}

describe("<Admin> basename", () => {
  it("a resource menu link carries the basename once", async () => {
    const router = makeRouter();
    await router.push("/admin");
    const wrapper = mount(Admin, {
      props: { dataProvider: fakeDataProvider({}), basename: "/admin" },
      slots: {
        default: () => h(Resource, { name: "posts", list: Posts }),
        dashboard: () => h("section", "dashboard"),
      },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.findAll("a").map((link) => link.attributes("href"))).toContain(
      "/app/admin/posts",
    );
  });
});
