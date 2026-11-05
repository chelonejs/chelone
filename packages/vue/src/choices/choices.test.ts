import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { z } from "zod";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import {
  type ChoicesContextValue,
  provideChoicesContext,
  useChoicesContext,
} from "./choices-context";
import {
  getChoicePath,
  type UseChoicesResult,
  useChoices,
} from "./use-choices";
import {
  type UseReferenceInputResult,
  useReferenceInput,
} from "./use-reference-input";

const resources = defineResources({
  authors: {
    schema: z.object({ id: z.number(), name: z.string() }),
  },
});
type Resources = typeof resources;

function makeQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Mount `setup` inside a bare Chelone context (no i18n → translate echoes). */
function mountInContext<T>(
  setup: () => T,
  ctxOverrides: Partial<CheloneContextValue> = {},
) {
  const capture: { value?: T } = {};
  const queryClient = makeQueryClient();
  const Probe = defineComponent({
    setup() {
      capture.value = setup();
      return () => null;
    },
  });
  const Provider = defineComponent({
    setup() {
      const ctx: CheloneContextValue = {
        dataProvider: fakeDataProvider({}),
        queryClient,
        ...ctxOverrides,
      };
      provideCheloneContext(ctx);
      return () => h(Probe);
    },
  });
  const wrapper = mount(Provider);
  return { capture, wrapper };
}

describe("useChoices", () => {
  const run = (opts?: Parameters<typeof useChoices>[0]): UseChoicesResult => {
    const { capture } = mountInContext(() => useChoices(opts));
    if (!capture.value) throw new Error("useChoices did not run");
    return capture.value;
  };

  it("resolves the display text from the default `name` path", () => {
    const c = run();
    expect(c.getChoiceText({ id: 1, name: "Alpha" })).toBe("Alpha");
  });

  it("resolves a dotted optionText path", () => {
    const c = run({ optionText: "author.full" });
    expect(c.getChoiceText({ id: 1, author: { full: "Ada L." } })).toBe(
      "Ada L.",
    );
  });

  it("uses a formatter optionText and bypasses translation", () => {
    const c = run({ optionText: (r) => `#${String(r.id)}` });
    expect(c.getChoiceText({ id: 7, name: "ignored" })).toBe("#7");
  });

  it("echoes the text when no i18n catalog maps it", () => {
    const c = run();
    expect(c.getChoiceText({ id: 1, name: "not.a.key" })).toBe("not.a.key");
  });

  it("resolves the value from optionValue, falling back to id", () => {
    const byDefault = run();
    expect(byDefault.getChoiceValue({ id: 42, name: "x" })).toBe(42);

    const byKey = run({ optionValue: "code" });
    expect(byKey.getChoiceValue({ id: 1, code: "AA", name: "x" })).toBe("AA");
    // Missing optionValue → falls back to id.
    expect(byKey.getChoiceValue({ id: 9, name: "x" })).toBe(9);
  });

  it("reads the disabled flag off disableValue", () => {
    const c = run();
    expect(c.getDisableValue({ id: 1, name: "x", disabled: true })).toBe(true);
    const custom = run({ disableValue: "locked" });
    expect(custom.getDisableValue({ id: 1, name: "x", locked: true })).toBe(
      true,
    );
  });

  it("optionText reads a bracket path", () => {
    const c = run({ optionText: "author[0].name" });
    expect(c.getChoiceText({ id: 1, author: [{ name: "Ada" }] })).toBe("Ada");
  });

  it("optionValue reads a bracket path", () => {
    const c = run({ optionValue: "refs[1].id" });
    expect(
      c.getChoiceValue({ id: 1, refs: [{ id: "first" }, { id: "second" }] }),
    ).toBe("second");
  });

  it("a flat key that contains a dot still wins", () => {
    const c = run({ optionText: "nested.level", optionValue: "nested.level" });
    const choice = { id: 1, "nested.level": "Flat", nested: { level: "Deep" } };
    expect(c.getChoiceText(choice)).toBe("Flat");
    expect(c.getChoiceValue(choice)).toBe("Flat");
  });

  it("an empty option path reads nothing, not the whole choice", () => {
    const c = run({ optionText: "", optionValue: "", disableValue: "" });
    expect(c.getChoiceText({ id: 7, name: "Seven" })).toBe("");
    expect(c.getChoiceValue({ id: 7, name: "Seven" })).toBe(7);
    expect(c.getDisableValue({ id: 7, name: "Seven" })).toBe(false);
    // The exported reader keeps the same contract.
    expect(getChoicePath({ id: 7, name: "Seven" }, "")).toBeUndefined();
  });
});

describe("useChoicesContext", () => {
  it("synthesizes a static inline context (props over context)", () => {
    const { capture } = mountInContext(() =>
      useChoicesContext({ choices: ["a", { id: 2, name: "B" }] }),
    );
    const ctx = capture.value as ChoicesContextValue;
    expect(ctx.isFromReference).toBe(false);
    expect(ctx.allChoices).toHaveLength(2);
    expect(ctx.allChoices).toEqual(ctx.availableChoices);
    expect(ctx.allChoices[0]).toEqual({ id: "a", name: "a" });
    expect(ctx.total).toBe(2);
    // List-mutation actions are inert on an inline context.
    expect(() => ctx.setPage(2)).not.toThrow();
  });

  it("reads the ambient provided context when no inline choices are given", () => {
    const capture: { ctx?: ChoicesContextValue } = {};
    const queryClient = makeQueryClient();
    const Child = defineComponent({
      setup() {
        capture.ctx = useChoicesContext();
        return () => null;
      },
    });
    const AmbientProvider = defineComponent({
      setup() {
        provideChoicesContext({ choices: [{ id: 1, name: "One" }] });
        return () => h(Child);
      },
    });
    const Root = defineComponent({
      setup() {
        provideCheloneContext({
          dataProvider: fakeDataProvider({}),
          queryClient,
        });
        return () => h(AmbientProvider);
      },
    });
    mount(Root);
    expect(capture.ctx?.allChoices).toEqual([{ id: 1, name: "One" }]);
  });

  it("throws when neither inline choices nor an ambient context is present", () => {
    expect(() => mountInContext(() => useChoicesContext())).toThrow(
      /pass `choices`/,
    );
  });
});

describe("useReferenceInput", () => {
  const authors = [
    { id: 1, name: "Ada" },
    { id: 2, name: "Alan" },
    { id: 3, name: "Grace" },
  ];

  function mountReference() {
    const capture: { ref?: UseReferenceInputResult } = {};
    const dataProvider = fakeDataProvider<Resources>({
      authors: structuredClone(authors),
    });
    const queryClient = makeQueryClient();
    const Probe = defineComponent({
      setup() {
        capture.ref = useReferenceInput<Resources, "authors">({
          reference: "authors",
        });
        return () => null;
      },
    });
    const Provider = defineComponent({
      setup() {
        provideCheloneContext({ dataProvider, queryClient });
        return () => h(Probe);
      },
    });
    const wrapper = mount(Provider);
    return { capture, wrapper };
  }

  const ref = (capture: { ref?: UseReferenceInputResult }) => {
    if (!capture.ref) throw new Error("useReferenceInput did not run");
    return capture.ref;
  };

  it("bridges the vanilla choices controller and fetches choices", async () => {
    const { capture } = mountReference();
    expect(ref(capture).isFromReference).toBe(true);
    // Reactive getters resolve to the fetched page after the query settles.
    await flushPromises();
    await vi.waitFor(() => expect(ref(capture).isPending).toBe(false));
    expect(ref(capture).availableChoices).toHaveLength(3);
    expect(ref(capture).availableChoices.map((c) => c.name)).toContain("Grace");
  });

  it("exposes the list-mutation actions", () => {
    const { capture } = mountReference();
    const r = ref(capture);
    expect(typeof r.setPage).toBe("function");
    expect(typeof r.setFilters).toBe("function");
    expect(typeof r.setValue).toBe("function");
    expect(typeof r.refetch).toBe("function");
  });
});
