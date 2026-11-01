/**
 * `useGuessedResource` tests: the composable reads the registry `<Admin>`
 * provides and describes the resource's Zod schema.
 */

import { defineResources, type ResourceDescriptor } from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { type ComputedRef, defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import type { CheloneContextValue } from "../../../context";
import { useGuessedResource } from "./use-guessed-resource";

const dataProvider = {
  name: "stub-dp",
} as unknown as CheloneContextValue["dataProvider"];

const registry = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string() }),
  },
  tags: {},
});

/** Mounts a probe for `resource` under `<Admin>` and returns what the composable gave. */
async function describeUnderAdmin(
  resource: string,
  adminProps: { registry?: typeof registry } = {},
) {
  let described: ComputedRef<ResourceDescriptor | undefined> | undefined;
  const Probe = defineComponent({
    setup() {
      described = useGuessedResource(resource);
      return () => null;
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
  mount(
    defineComponent({
      setup: () => () =>
        h(Admin, { dataProvider, ...adminProps }, { default: () => h(Probe) }),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  if (!described) throw new Error("the probe did not run");
  return described.value;
}

describe("useGuessedResource", () => {
  it("describes the registered schema of the resource", async () => {
    const described = await describeUnderAdmin("posts", { registry });

    expect(described?.resource).toBe("posts");
    expect(described?.fields.map((f) => [f.source, f.kind])).toEqual([
      ["id", "number"],
      ["title", "text"],
    ]);
  });

  it("is undefined for a resource without a schema", async () => {
    expect(await describeUnderAdmin("tags", { registry })).toBeUndefined();
    expect(await describeUnderAdmin("unknown", { registry })).toBeUndefined();
  });

  it("is undefined when Admin has no registry", async () => {
    expect(await describeUnderAdmin("posts")).toBeUndefined();
  });
});
