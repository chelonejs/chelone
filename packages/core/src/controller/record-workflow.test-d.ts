import { describe, expectTypeOf, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import type { SourceKey } from "../resource/source-path";
import {
  type ApprovalOptions,
  buildApprovalUpdate,
  getAllowedTransitions,
  getApprovalState,
  type TransitionOptions,
} from "./record-workflow";

interface Post {
  id: number;
  title: string;
  reviewers: number[];
  stage: string;
  address: { city: string };
}

declare const post: Post;
declare const loose: LooseRecord;

describe("record workflow types", () => {
  it("getApprovalState and buildApprovalUpdate accept a top-level key of the record", () => {
    getApprovalState(post, {
      approverSource: "reviewers",
      statusSource: "stage",
    });
    buildApprovalUpdate(post, {
      approverSource: "reviewers",
      statusSource: "stage",
      identityId: 1,
    });
    expectTypeOf<ApprovalOptions<Post>["approverSource"]>().toEqualTypeOf<
      SourceKey<Post> | undefined
    >();
    expectTypeOf<ApprovalOptions<Post>["statusSource"]>().toEqualTypeOf<
      "id" | "title" | "reviewers" | "stage" | "address" | undefined
    >();
  });

  it("they reject a key that is not on the record", () => {
    // @ts-expect-error `reviewer` is not a key of Post
    getApprovalState(post, { approverSource: "reviewer" });
    // @ts-expect-error `reviewer` is not a key of Post
    buildApprovalUpdate(post, { approverSource: "reviewer", identityId: 1 });
    // @ts-expect-error `state` is not a key of Post, and getApprovalState reads the options
    getApprovalState(post, { statusSource: "state" });
    // @ts-expect-error a nested path is not a top-level key
    getApprovalState(post, { approverSource: "address.city" });
  });

  it("buildApprovalUpdate writes a status field the record does not have yet", () => {
    buildApprovalUpdate(
      { signers: ["a"] },
      {
        approverSource: "signers",
        statusSource: "state",
        identityId: "b",
      },
    );
  });

  it("getAllowedTransitions types source by the record", () => {
    getAllowedTransitions(post, { source: "stage", transitions: {} });
    expectTypeOf<TransitionOptions<Post>["source"]>().toEqualTypeOf<
      SourceKey<Post> | undefined
    >();
    // @ts-expect-error `status` is not a key of Post
    getAllowedTransitions(post, { source: "status", transitions: {} });
  });

  it("a guard receives the record's own type", () => {
    getAllowedTransitions(post, {
      source: "stage",
      transitions: { draft: ["live"] },
      guards: {
        "draft->live": (record) => {
          expectTypeOf(record).toEqualTypeOf<Post>();
          return record.title !== "";
        },
      },
    });
  });

  it("pendingValue and approvedValue are strings", () => {
    buildApprovalUpdate(post, {
      identityId: 1,
      pendingValue: "waiting",
      approvedValue: "done",
    });
    // @ts-expect-error a status is a string
    buildApprovalUpdate(post, { identityId: 1, pendingValue: 1 });
    // @ts-expect-error a status is a string
    buildApprovalUpdate(post, { identityId: 1, approvedValue: true });
  });

  it("a loose record takes any string", () => {
    getApprovalState(loose, { approverSource: "anything" });
    buildApprovalUpdate(loose, { statusSource: "whatever", identityId: 1 });
    getAllowedTransitions(loose, { source: "free", transitions: {} });
    expectTypeOf<
      ApprovalOptions<LooseRecord>["approverSource"]
    >().toEqualTypeOf<string | undefined>();
    expectTypeOf<TransitionOptions<LooseRecord>["source"]>().toEqualTypeOf<
      string | undefined
    >();
  });
});
