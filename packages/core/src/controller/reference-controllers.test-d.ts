import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { GetManyReferenceParams } from "../data/types";
import { defineResources, type RecordOf } from "../resource/registry";
import type { SourceKey } from "../resource/source-path";
import type { ListControllerContext } from "./list-controller";
import {
  createReferenceManyController,
  type ReferenceManyControllerOptions,
} from "./reference-many-controller";
import {
  createReferenceOneController,
  type ReferenceOneControllerOptions,
} from "./reference-one-controller";

const resources = defineResources({
  comments: {
    schema: z.object({ id: z.number(), post_id: z.number(), body: z.string() }),
  },
});
type Comment = RecordOf<typeof resources, "comments">;

declare const ctx: ListControllerContext<typeof resources>;

describe("a reference controller keys its target by the referenced record", () => {
  it("the options' target is SourceKey of the referenced record", () => {
    expectTypeOf<
      ReferenceManyControllerOptions<Comment>["target"]
    >().toEqualTypeOf<SourceKey<Comment>>();
    expectTypeOf<
      ReferenceOneControllerOptions<Comment>["target"]
    >().toEqualTypeOf<SourceKey<Comment>>();
    expectTypeOf<
      ReferenceManyControllerOptions<Comment>["target"]
    >().toEqualTypeOf<"id" | "post_id" | "body">();
  });

  it("createReferenceManyController rejects a misspelt target", () => {
    createReferenceManyController(ctx, "comments", {
      target: "post_id",
      id: 1,
    });
    createReferenceManyController(ctx, "comments", {
      // @ts-expect-error "postd_id" is not a key of Comment
      target: "postd_id",
      id: 1,
    });
  });

  it("createReferenceOneController rejects a misspelt target", () => {
    createReferenceOneController(ctx, "comments", {
      target: "post_id",
      id: 1,
    });
    createReferenceOneController(ctx, "comments", {
      // @ts-expect-error "postd_id" is not a key of Comment
      target: "postd_id",
      id: 1,
    });
  });

  it("the options with no type argument still take any string target", () => {
    const many: ReferenceManyControllerOptions = {
      target: "anything.at[0]",
      id: 1,
    };
    const one: ReferenceOneControllerOptions = { target: "whatever", id: 1 };
    void many;
    void one;
    expectTypeOf<
      ReferenceManyControllerOptions["target"]
    >().toEqualTypeOf<string>();
    expectTypeOf<
      ReferenceOneControllerOptions["target"]
    >().toEqualTypeOf<string>();
  });

  it("the data-provider verb keeps a plain string target", () => {
    expectTypeOf<GetManyReferenceParams["target"]>().toEqualTypeOf<string>();
  });
});
