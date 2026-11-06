import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { ApprovalQueueProps } from "./approval-queue";

// A type alias: an interface has no index signature, so it does not satisfy
// the queue's `LooseRecord` constraint.
type Post = {
  id: number;
  title: string;
  author: { name: string };
  status: string;
};

describe("ApprovalQueue source props", () => {
  it("the title sources are SourceProp", () => {
    expectTypeOf<ApprovalQueueProps["titleSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<ApprovalQueueProps["subtitleSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<ApprovalQueueProps["statusSource"]>().toEqualTypeOf<
      string | undefined
    >();
  });

  it("they follow an explicit record type", () => {
    expectTypeOf<ApprovalQueueProps<Post>["titleSource"]>().toEqualTypeOf<
      SourceProp<Post> | undefined
    >();
    expectTypeOf<ApprovalQueueProps<Post>["subtitleSource"]>().toEqualTypeOf<
      SourceProp<Post> | undefined
    >();
    expectTypeOf<"author.name">().toExtend<
      NonNullable<ApprovalQueueProps<Post>["subtitleSource"]>
    >();
    expectTypeOf<ApprovalQueueProps<Post>["statusSource"]>().toEqualTypeOf<
      "id" | "title" | "author" | "status" | undefined
    >();
  });

  it("a key that is not on the record is rejected", () => {
    const title: ApprovalQueueProps<Post> = {
      // @ts-expect-error `name` is not a path of Post
      titleSource: "name",
    };
    const subtitle: ApprovalQueueProps<Post> = {
      // @ts-expect-error `summary` is not a path of Post
      subtitleSource: "summary",
    };
    expectTypeOf(title).not.toBeAny();
    expectTypeOf(subtitle).not.toBeAny();
  });
});
