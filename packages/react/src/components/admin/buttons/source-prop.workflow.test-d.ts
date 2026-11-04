import { describe, expectTypeOf, it } from "vitest";
import type { DualApprovalButtonProps } from "./dual-approval-button";
import type { StatusTransitionButtonProps } from "./status-transition-button";

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

  it("pendingValue and approvedValue take a value of the record", () => {
    type Ticket = { id: string; status: string };

    expectTypeOf<
      DualApprovalButtonProps<Ticket>["pendingValue"]
    >().toEqualTypeOf<string | undefined>();
    expectTypeOf<
      DualApprovalButtonProps<Ticket>["approvedValue"]
    >().toEqualTypeOf<string | undefined>();

    const approval: DualApprovalButtonProps<Ticket> = {
      pendingValue: "open",
      // @ts-expect-error a number is not a value of a string-valued record
      approvedValue: 1,
    };
    void approval;
  });
});
