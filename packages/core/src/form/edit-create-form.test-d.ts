import { QueryClient } from "@tanstack/query-core";
import { expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { SaveOptions } from "../controller/record-controllers";
import { fakeDataProvider } from "../data/fake-provider";
import { defineResources } from "../resource/registry";
import {
  createCreateFormController,
  createEditFormController,
  type EditFormController,
  type FormControllerContext,
  resolveHydrationAction,
} from "./edit-create-form";
import type { CheloneFormApi } from "./form-controller";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

type Post = z.infer<(typeof resources)["posts"]["schema"]>;

const ctx = {
  dataProvider: fakeDataProvider<typeof resources>({ posts: [] }),
  queryClient: new QueryClient(),
};

const transforming = defineResources({
  posts: {
    schema: z.object({ id: z.string().transform(Number), title: z.string() }),
  },
});

declare const transformingCtx: FormControllerContext<typeof transforming>;

it("createEditFormController infers the record type from the registry — no any leaks", () => {
  const controller = createEditFormController(ctx, "posts", { id: 1 });
  expectTypeOf(controller).not.toBeAny();
  expectTypeOf(controller).toEqualTypeOf<EditFormController<Post>>();
  expectTypeOf(controller.getSnapshot().record).toEqualTypeOf<
    Post | undefined
  >();
  expectTypeOf(controller.getSnapshot().form.values).toEqualTypeOf<
    Partial<Post>
  >();
  expectTypeOf(controller.getSnapshot().saving).toEqualTypeOf<boolean>();
  expectTypeOf(controller.submit).toEqualTypeOf<
    (options?: SaveOptions<Post>) => Promise<void>
  >();
  expectTypeOf(controller.form.state.values).toEqualTypeOf<Partial<Post>>();
});

it("createCreateFormController types the seed and created record", () => {
  const controller = createCreateFormController(ctx, "posts", {
    record: { title: "seed" },
    onSuccess: (record) => {
      expectTypeOf(record).toEqualTypeOf<Post>();
    },
  });
  expectTypeOf(controller).not.toBeAny();
  expectTypeOf(controller.getSnapshot().record).toEqualTypeOf<Partial<Post>>();
  expectTypeOf(controller.getSnapshot().form.values).toEqualTypeOf<
    Partial<Post>
  >();
});

it("createCreateFormController without defaultValues still gives FormController<Partial<Post>>", () => {
  const controller = createCreateFormController(ctx, "posts");
  expectTypeOf(controller.form).toEqualTypeOf<CheloneFormApi<Partial<Post>>>();
  expectTypeOf(controller.getSnapshot().form.values).toEqualTypeOf<
    Partial<Post>
  >();
});

it("an edit form over a transforming registry schema infers its record from the schema output", () => {
  const controller = createEditFormController(transformingCtx, "posts", {
    id: 1,
  });
  expectTypeOf(controller).toEqualTypeOf<
    EditFormController<{ id: number; title: string }>
  >();
});

it("resolveHydrationAction is a closed union", () => {
  expectTypeOf(resolveHydrationAction(1, 2, true)).toEqualTypeOf<
    "rebaseline" | "hard-reset" | "keep-dirty" | "partial-apply"
  >();
});
