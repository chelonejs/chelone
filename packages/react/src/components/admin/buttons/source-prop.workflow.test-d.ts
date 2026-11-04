import { describe, expectTypeOf, it } from "vitest";
import type { DualApprovalButtonProps } from "./dual-approval-button";
import type { StatusTransitionButtonProps } from "./status-transition-button";

// A type alias: an interface has no index signature, so it does not satisfy
// the buttons' `Record<string, unknown>` constraint.
type Post = {
  id: number;
  reviewers: number[];
  stage: string;
};

describe("workflow button source props", () => {
  it("the source props follow an explicit record type", () => {
    expectTypeOf<
      DualApprovalButtonProps<Post>["approverSource"]
    >().toEqualTypeOf<"id" | "reviewers" | "stage" | undefined>();
    expectTypeOf<DualApprovalButtonProps<Post>["statusSource"]>().toEqualTypeOf<
      "id" | "reviewers" | "stage" | undefined
    >();
    expectTypeOf<StatusTransitionButtonProps<Post>["source"]>().toEqualTypeOf<
      "id" | "reviewers" | "stage" | undefined
    >();

    const approver: DualApprovalButtonProps<Post> = {
      // @ts-expect-error `reviewer` is not a key of Post
      approverSource: "reviewer",
    };
    const status: StatusTransitionButtonProps<Post> = {
      // @ts-expect-error `state` is not a key of Post
      source: "state",
      transitions: {},
    };
    void approver;
    void status;
  });

  it("the default record keeps them a string", () => {
    expectTypeOf<DualApprovalButtonProps["approverSource"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<DualApprovalButtonProps["statusSource"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<StatusTransitionButtonProps["source"]>().toEqualTypeOf<
      string | undefined
    >();
  });
});
