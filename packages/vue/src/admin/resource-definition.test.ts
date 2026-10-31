import { fakeDataProvider } from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { provideResourceContext } from "../resource-context";
import Admin from "./admin.vue";
import Resource from "./resource.vue";
import {
  type UseResourceDefinitionOptions,
  useResourceDefinition,
} from "./resource-registry";

const View = defineComponent({ render: () => h("div") });

async function mountProbe(
  options: UseResourceDefinitionOptions | undefined,
  ambient?: string,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  await router.push("/");
  const capture: { result?: ReturnType<typeof useResourceDefinition> } = {};
  const Probe = defineComponent({
    setup() {
      capture.result = useResourceDefinition(options);
      return () => null;
    },
  });
  const Ambient = defineComponent({
    setup(_, { slots }) {
      if (ambient) provideResourceContext(ambient);
      return () => slots.default?.();
    },
  });
  mount(
    defineComponent({
      setup: () => () =>
        h(
          Admin,
          { dataProvider: fakeDataProvider({}) },
          {
            default: () => [
              h(Resource, { name: "posts", list: View, show: View }),
              h(Resource, {
                name: "tags",
                list: View,
                edit: View,
                create: View,
              }),
              h(Ambient, null, { default: () => h(Probe) }),
            ],
            layout: () => h("div"),
          },
        ),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return capture;
}

describe("useResourceDefinition", () => {
  it("useResourceDefinition reports which views a resource registered", async () => {
    const posts = await mountProbe({ resource: "posts" });
    expect(posts.result?.value).toMatchObject({
      hasList: true,
      hasCreate: false,
      hasEdit: false,
      hasShow: true,
    });

    const tags = await mountProbe(undefined, "tags");
    expect(tags.result?.value).toMatchObject({
      hasList: true,
      hasCreate: true,
      hasEdit: true,
      hasShow: false,
    });
  });

  it("an override option wins over the registry entry", async () => {
    const capture = await mountProbe({
      resource: "posts",
      hasShow: false,
      hasEdit: true,
      recordRepresentation: "title",
    });
    expect(capture.result?.value).toMatchObject({
      hasList: true,
      hasEdit: true,
      hasShow: false,
      recordRepresentation: "title",
    });
  });
});
