/**
 * `useGetRecordRepresentation(resource?)` — the Vue twin of
 * `@chelone/react`'s `label/use-get-record-representation.tsx`. Each case
 * mounts a probe under a resource registry holding one definition and asserts
 * the representation the composable resolves for a record.
 */

import { mount, type VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, provide } from "vue";
import {
  createResourceRegistry,
  ResourceRegistryKey,
} from "../admin/resource-registry";
import { provideResourceContext } from "../resource-context";
import {
  type GetRecordRepresentation,
  useGetRecordRepresentation,
} from "./use-get-record-representation";

interface MountOptions {
  /** The `recordRepresentation` of the registered `posts` definition. */
  recordRepresentation?: unknown;
  /** The record the probe renders. */
  record: unknown;
  /** Passed to the composable; omit to read the ambient resource instead. */
  resource?: string;
  /** The ambient resource name provided to the subtree. */
  ambient?: string;
}

/** Mount the composable against a registry holding one `posts` definition. */
function mountRepresentation(options: MountOptions): {
  wrapper: VueWrapper;
  represent: (record: unknown) => string;
} {
  const registry = createResourceRegistry();
  registry.register({
    name: "posts",
    recordRepresentation: options.recordRepresentation,
  });

  const captured: { resolve?: GetRecordRepresentation } = {};
  const Probe = defineComponent({
    setup() {
      captured.resolve = useGetRecordRepresentation(options.resource);
      return () =>
        h(
          "span",
          { "data-slot": "record-representation" },
          captured.resolve?.(options.record) ?? "",
        );
    },
  });
  const Harness = defineComponent({
    setup() {
      provide(ResourceRegistryKey, registry);
      if (options.ambient) provideResourceContext(options.ambient);
      return () => h(Probe);
    },
  });

  return {
    wrapper: mount(Harness),
    represent: (record: unknown) => captured.resolve?.(record) ?? "",
  };
}

describe("useGetRecordRepresentation", () => {
  it("a string-path representation reads a bracket path", () => {
    const { wrapper, represent } = mountRepresentation({
      recordRepresentation: "tags[1].label",
      record: { id: 1, tags: [{ label: "a" }, { label: "b" }] },
      resource: "posts",
    });
    expect(wrapper.get('[data-slot="record-representation"]').text()).toBe("b");
    expect(represent({ id: 2, tags: [{ label: "c" }, { label: "d" }] })).toBe(
      "d",
    );
  });

  it("an empty path returns the record", () => {
    const record = { id: 1, title: "Whole" };
    const { represent } = mountRepresentation({
      recordRepresentation: "",
      record,
      resource: "posts",
    });
    // The Vue representation is a string, so reading the whole record reads the
    // record itself (stringified) rather than an absent value, which is "".
    expect(represent(record)).toBe(String(record));
  });

  it("uses a function recordRepresentation", () => {
    const { represent } = mountRepresentation({
      recordRepresentation: (r: { title: string }) => `Post: ${r.title}`,
      record: { id: 1, title: "Hello" },
      resource: "posts",
    });
    expect(represent({ id: 1, title: "Hello" })).toBe("Post: Hello");
  });

  it("falls back to the default chain: name → title → label → reference → #id", () => {
    const { represent } = mountRepresentation({ record: { id: 1 } });
    expect(represent({ id: 1, name: "N" })).toBe("N");
    expect(represent({ id: 2, title: "T" })).toBe("T");
    expect(represent({ id: 3, label: "L" })).toBe("L");
    expect(represent({ id: 4, reference: "R" })).toBe("R");
    expect(represent({ id: 5 })).toBe("#5");
    expect(represent({ id: 6, name: "", title: "T" })).toBe("T");
  });

  it("returns an empty string for a nullish record", () => {
    const { represent } = mountRepresentation({ record: null });
    expect(represent(null)).toBe("");
    expect(represent(undefined)).toBe("");
  });

  it("reads the resource from context when no argument is passed", () => {
    const { wrapper } = mountRepresentation({
      recordRepresentation: "title",
      record: { id: 1, title: "Ctx" },
      ambient: "posts",
    });
    expect(wrapper.get('[data-slot="record-representation"]').text()).toBe(
      "Ctx",
    );
  });
});
