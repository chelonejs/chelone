/**
 * V1-c Task 8 — `<Admin :registry>` threads the zod resource registry into the
 * Chelone context so `useForm` auto-resolves a resource's schema as the DEFAULT
 * form validator. This closes the V1-b wiring gap: the core save-pipeline and
 * `useForm` already READ `ctx.resources`, but `<Admin>` never PUT the registry
 * there — so schema validation never fired under the shell.
 *
 * Two levels of proof:
 *  1. `<Admin :registry>` places the registry on the injected context value
 *     (`ctx.resources === registry`).
 *  2. End-to-end: a form under `<Admin :registry>` that passes NO explicit
 *     schema still validates against the registry schema on submit (invalid
 *     record → save blocked, `isValid === false`), with the message auto-
 *     resolved from the resource's zod schema.
 */

import { defineResources } from "@chelone/core";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, inject } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import { CheloneContextKey, type CheloneContextValue } from "../context";
import { type UseFormReturn, useForm } from "../form/use-form";
import Admin from "./admin.vue";

const postSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "chelone.required"),
  views: z.number(),
});
const registry = defineResources({ posts: { schema: postSchema } });
interface Post {
  id: number;
  title: string;
  views: number;
}

const dataProvider = {
  name: "stub-dp",
} as unknown as CheloneContextValue["dataProvider"];

/** A fresh empty router; `/` avoids no-match noise. */
function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });
}

describe("<Admin :registry> — registry threading + schema auto-resolve", () => {
  it("places the zod registry on the injected Chelone context", async () => {
    const router = makeRouter();
    const capture: { context?: CheloneContextValue } = {};
    const Probe = defineComponent({
      setup() {
        capture.context = inject(CheloneContextKey) ?? undefined;
        return () => null;
      },
    });

    // Mount via a parent so the provider value is passed raw (not reactive()-
    // wrapped) — preserving the identity assertion (see admin.test.ts).
    const Harness = defineComponent({
      setup() {
        return () =>
          h(Admin, { dataProvider, registry }, { default: () => h(Probe) });
      },
    });
    mount(Harness, { global: { plugins: [router] } });
    await flushPromises();

    expect(capture.context?.resources).toBe(registry);
  });

  it("auto-resolves the resource schema so an invalid submit is blocked (no explicit schema)", async () => {
    const router = makeRouter();
    const onSubmit = vi.fn(async () => undefined);
    const capture: { result?: UseFormReturn<Post> } = {};

    // A form view WITHOUT an explicit `schema` — it names the resource only.
    const FormView = defineComponent({
      setup() {
        capture.result = useForm<Post>({
          record: { id: 1, title: "", views: 1 },
          resource: "posts",
          onSubmit,
        });
        return () => null;
      },
    });
    const Harness = defineComponent({
      setup() {
        return () =>
          h(Admin, { dataProvider, registry }, { default: () => h(FormView) });
      },
    });

    mount(Harness, { global: { plugins: [router] } });
    await flushPromises();

    const form = capture.result;
    if (!form) throw new Error("useForm did not run");

    await form.submit();
    await flushPromises();

    // The empty title violates the registry schema — save is blocked and the
    // form is invalid, proving the schema was resolved from `<Admin :registry>`.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.form.state.isValid).toBe(false);
  });

  it("resolves nothing when no registry is supplied (invalid record still saves)", async () => {
    const router = makeRouter();
    const onSubmit = vi.fn(async () => undefined);
    const capture: { result?: UseFormReturn<Post> } = {};

    const FormView = defineComponent({
      setup() {
        capture.result = useForm<Post>({
          record: { id: 1, title: "", views: 1 },
          resource: "posts",
          onSubmit,
        });
        return () => null;
      },
    });
    const Harness = defineComponent({
      setup() {
        // No `registry` prop — no default schema, so nothing validates.
        return () => h(Admin, { dataProvider }, { default: () => h(FormView) });
      },
    });

    mount(Harness, { global: { plugins: [router] } });
    await flushPromises();

    const form = capture.result;
    if (!form) throw new Error("useForm did not run");

    await form.submit();
    await flushPromises();

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
