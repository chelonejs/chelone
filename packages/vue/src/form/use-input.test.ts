import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { z } from "zod";
import { type CheloneContextValue, provideCheloneContext } from "../context";
import { type UseFormOptions, type UseFormReturn, useForm } from "./use-form";
import {
  type UseInputOptions,
  type UseInputReturn,
  useInput,
} from "./use-input";

const postSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "chelone.required"),
  views: z.number(),
});
type Post = { id: number; title: string; views: number };

interface Capture {
  form?: UseFormReturn<Post>;
  input?: UseInputReturn;
}

function mountInput(
  formOptions: UseFormOptions<Post>,
  inputOptions: UseInputOptions,
) {
  const capture: Capture = {};
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const InputProbe = defineComponent({
    setup() {
      capture.input = useInput(inputOptions);
      return () => null;
    },
  });
  const FormProbe = defineComponent({
    setup() {
      capture.form = useForm<Post>(formOptions);
      return () => h(InputProbe);
    },
  });
  const Provider = defineComponent({
    setup() {
      const ctx: CheloneContextValue = {
        dataProvider: {} as CheloneContextValue["dataProvider"],
        queryClient,
      };
      provideCheloneContext(ctx);
      return () => h(FormProbe);
    },
  });

  mount(Provider);
  return { capture };
}

const input = (capture: Capture): UseInputReturn => {
  if (!capture.input) throw new Error("useInput did not run");
  return capture.input;
};
const form = (capture: Capture): UseFormReturn<Post> => {
  if (!capture.form) throw new Error("useForm did not run");
  return capture.form;
};

describe("useInput", () => {
  it("two-way binds the field to the ambient form", async () => {
    const { capture } = mountInput(
      {
        record: { id: 1, title: "start", views: 0 },
        onSubmit: async () => undefined,
      },
      { source: "title" },
    );
    await nextTick();

    // Seeded from the ambient form value.
    expect(input(capture).value.value).toBe("start");

    // input → form
    input(capture).setValue("typed");
    await nextTick();
    expect(form(capture).form.state.values.title).toBe("typed");
    expect(input(capture).value.value).toBe("typed");

    // form → input
    form(capture).form.setFieldValue("title", "external");
    await nextTick();
    expect(input(capture).value.value).toBe("external");
  });

  it("surfaces a schema validation error as a displayable message", async () => {
    const { capture } = mountInput(
      {
        record: { id: 1, title: "", views: 0 },
        onSubmit: async () => undefined,
        schema: postSchema as UseFormOptions<Post>["schema"],
      },
      { source: "title" },
    );
    await nextTick();

    // Validate-on-submit: no error before the first submit.
    expect(input(capture).error.value).toBeUndefined();

    await form(capture).submit();
    await flushPromises();
    await nextTick();

    expect(input(capture).error.value).toBe("chelone.required");
  });

  it("maps a server field error onto the field", async () => {
    const { capture } = mountInput(
      {
        record: { id: 1, title: "ok", views: 0 },
        onSubmit: async () => ({ title: "chelone.taken" }),
      },
      { source: "title" },
    );
    await nextTick();

    await form(capture).submit();
    await flushPromises();
    await nextTick();

    expect(input(capture).error.value).toBe("chelone.taken");
  });

  it("flips touched after blur", async () => {
    const { capture } = mountInput(
      {
        record: { id: 1, title: "x", views: 0 },
        onSubmit: async () => undefined,
      },
      { source: "title" },
    );
    await nextTick();

    expect(input(capture).touched.value).toBe(false);
    input(capture).blur();
    await nextTick();
    expect(input(capture).touched.value).toBe(true);
  });

  it("uses an explicit id and derives name from the source", () => {
    const { capture } = mountInput(
      {
        record: { id: 1, title: "x", views: 0 },
        onSubmit: async () => undefined,
      },
      { source: "title", id: "post-title" },
    );

    expect(input(capture).name).toBe("title");
    expect(input(capture).id).toBe("post-title");
  });

  it("generates a stable id when none is given", () => {
    const { capture } = mountInput(
      {
        record: { id: 1, title: "x", views: 0 },
        onSubmit: async () => undefined,
      },
      { source: "title" },
    );

    expect(typeof input(capture).id).toBe("string");
    expect(input(capture).id.length).toBeGreaterThan(0);
  });
});
