import { fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import Admin from "../../../admin/admin.vue";
import Resource from "../../../admin/resource.vue";
import { provideRecordContext } from "../../../record/record-context";
import ReferenceField, {
  type ReferenceFieldProps,
} from "./reference-field.vue";

const View = defineComponent({ render: () => h("div") });

const Row = defineComponent({
  props: {
    link: { type: [String, Boolean], default: undefined },
    onRowClick: { type: Function, default: undefined },
  },
  setup(props) {
    provideRecordContext({ id: 10, author_id: 1 });
    return () =>
      h(
        "div",
        { "data-slot": "row", onClick: props.onRowClick as () => void },
        h(ReferenceField, {
          source: "author_id",
          reference: "authors",
          link: props.link,
        } as ReferenceFieldProps),
      );
  },
});

async function mountField(
  rowProps: { link?: string | boolean; onRowClick?: () => void } = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: { render: () => null } }],
  });
  await router.push("/");
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          {
            dataProvider: fakeDataProvider({
              authors: [{ id: 1, name: "Jane Doe" }],
            }),
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
          {
            default: () => [
              h(Resource, { name: "authors", list: View, show: View }),
              h(Row, rowProps),
            ],
            layout: () => h("div"),
          },
        ),
    }),
    { global: { plugins: [router] } },
  );
  await vi.waitFor(() =>
    expect(wrapper.find('[data-slot="reference-field"]').exists()).toBe(true),
  );
  await flushPromises();
  return wrapper;
}

enableAutoUnmount(afterEach);

describe("ReferenceField link", () => {
  it('link="show" wraps the value in a link to the show page', async () => {
    const wrapper = await mountField({ link: "show" });
    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe("/authors/1/show");
    expect(link.find('[data-slot="reference-field"]').text()).toBe("Jane Doe");
  });

  it("an omitted link infers show when the reference has a show view", async () => {
    const wrapper = await mountField();
    expect(wrapper.find("a").attributes("href")).toBe("/authors/1/show");
  });

  it("link false renders no link", async () => {
    const wrapper = await mountField({ link: false });
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find('[data-slot="reference-field"]').text()).toBe(
      "Jane Doe",
    );
  });

  it("a link click does not reach the parent click handler", async () => {
    const onRowClick = vi.fn();
    const wrapper = await mountField({ link: "show", onRowClick });
    await wrapper.find("a").trigger("click");
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
