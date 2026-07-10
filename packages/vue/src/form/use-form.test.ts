import { defineResources } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { z } from "zod";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import { provideResourceContext } from "../resource-context";
import { type UseFormOptions, type UseFormReturn, useForm } from "./use-form";

const postSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "chelone.required"),
  views: z.number(),
});
const resources = defineResources({ posts: { schema: postSchema } });
type Post = { id: number; title: string; views: number };

interface MountCfg {
  /** Provide the zod registry so the schema-from-registry path fires. */
  resources?: boolean;
  /** Provide an ambient `<Resource>` name for the schema lookup. */
  resource?: string;
}

function mountForm(options: UseFormOptions<Post>, cfg: MountCfg = {}) {
  const capture: { result?: UseFormReturn<Post> } = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const FormProbe = defineComponent({
    setup() {
      capture.result = useForm<Post>(options);
      return () => null;
    },
  });
  const Provider = defineComponent({
    setup() {
      const ctx: CheloneContextValue = {
        dataProvider: {} as CheloneContextValue["dataProvider"],
        queryClient,
        resources: cfg.resources ? resources : undefined,
      };
      provideCheloneContext(ctx);
      if (cfg.resource) provideResourceContext(cfg.resource);
      return () => h(FormProbe);
    },
  });

  const wrapper = mount(Provider);
  return { capture, wrapper };
}

const result = (capture: {
  result?: UseFormReturn<Post>;
}): UseFormReturn<Post> => {
  if (!capture.result) throw new Error("useForm did not run");
  return capture.result;
};

describe("useForm", () => {
  it("calls onSubmit with the typed form values", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const { capture } = mountForm({
      record: { id: 1, title: "hello", views: 5 },
      onSubmit,
    });

    await result(capture).submit();
    await flushPromises();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ id: 1, title: "hello", views: 5 });
  });

  it("exposes the live form values reactively", async () => {
    const { capture } = mountForm({
      record: { id: 1, title: "a", views: 1 },
      onSubmit: async () => undefined,
    });

    expect(result(capture).values.value).toEqual({
      id: 1,
      title: "a",
      views: 1,
    });

    result(capture).form.setFieldValue("title", "b");
    await nextTick();

    expect(result(capture).values.value.title).toBe("b");
  });

  it("validates on submit against the registry schema and blocks save", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const { capture } = mountForm(
      { record: { id: 1, title: "", views: 1 }, onSubmit },
      { resources: true, resource: "posts" },
    );

    await result(capture).submit();
    await flushPromises();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result(capture).form.state.isValid).toBe(false);
  });

  it("accepts an explicit schema override", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const { capture } = mountForm({
      record: { id: 1, title: "", views: 1 },
      onSubmit,
      schema: postSchema as UseFormOptions<Post>["schema"],
    });

    await result(capture).submit();
    await flushPromises();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rebaselines the form on a successful save (D5 reset)", async () => {
    const { capture } = mountForm({
      record: { id: 1, title: "orig", views: 1 },
      onSubmit: async () => undefined,
    });

    result(capture).form.setFieldValue("title", "edited");
    await nextTick();
    expect(result(capture).form.state.isDirty).toBe(true);

    await result(capture).submit();
    await flushPromises();

    expect(result(capture).form.state.values.title).toBe("edited");
    expect(result(capture).form.state.isDefaultValue).toBe(true);
  });

  it("reflects the submitting flag", async () => {
    const { capture } = mountForm({
      record: { id: 1, title: "x", views: 1 },
      onSubmit: async () => undefined,
    });

    expect(result(capture).submitting.value).toBe(false);
  });
});
