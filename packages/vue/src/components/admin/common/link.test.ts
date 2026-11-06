/**
 * `<Link>` — the admin navigation link, styled once over vue-router's
 * `RouterLink`. Mounted under a real `<Admin>` and a memory router.
 */

import { fakeDataProvider } from "@chelone/core";
import { elementOf } from "@chelone/test-utils";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Link, { type LinkProps } from "./link.vue";

const mounted: Array<{ unmount: () => void }> = [];
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
});

function mountLink(
  props: LinkProps,
  slot?: (slotProps: Record<string, unknown>) => unknown,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/posts", component: { render: () => null } },
    ],
  });
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({}),
            queryClient: new QueryClient(),
          },
          {
            default: () => h(Link, props, { default: slot ?? (() => "Posts") }),
            layout: () => h("div"),
          },
        );
    },
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  return { router };
}

const anchor = () => elementOf(document.querySelector("a"), HTMLAnchorElement);

describe("<Link>", () => {
  it("renders an anchor to the given path", async () => {
    const { router } = mountLink({ to: "/posts" });
    await router.isReady();
    await flushPromises();
    expect(anchor().tagName).toBe("A");
    expect(anchor().getAttribute("href")).toBe("/posts");
    expect(anchor().textContent).toBe("Posts");
  });

  it("appends class after the default link classes", async () => {
    const { router } = mountLink({ to: "/posts", class: "custom-class" });
    await router.isReady();
    await flushPromises();
    const classes = anchor().className.split(" ");
    expect(classes).toContain("text-primary");
    expect(classes).toContain("underline-offset-4");
    expect(classes).toContain("hover:underline");
    expect(classes.at(-1)).toBe("custom-class");
  });

  it("navigates on click", async () => {
    const { router } = mountLink({ to: "/posts" });
    await router.isReady();
    await flushPromises();
    anchor().click();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts");
  });

  it("hands RouterLink's slot props to the default slot", async () => {
    const { router } = mountLink(
      { to: "/posts", custom: true },
      ({ href, navigate, isActive }) =>
        h(
          "a",
          { href, "data-active": String(isActive), onClick: navigate },
          "Posts",
        ),
    );
    await router.isReady();
    await flushPromises();
    expect(anchor().getAttribute("href")).toBe("/posts");
    expect(anchor().getAttribute("data-active")).toBe("false");
    anchor().click();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/posts");
  });
});
