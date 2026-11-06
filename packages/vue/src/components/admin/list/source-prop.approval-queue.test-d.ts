import type { SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { ApprovalQueueProps } from "./approval-queue.vue";

// A type alias: an interface has no index signature, so it does not satisfy
// the queue's `LooseRecord` constraint.
type Ticket = {
  id: number;
  summary: string;
  owner: { email: string };
  state: string;
};

describe("ApprovalQueue source props", () => {
  it("the title sources are SourceProp", () => {
    type Default = ApprovalQueueProps;
    expectTypeOf<
      NonNullable<Default["titleSource"]>
    >().toEqualTypeOf<SourceProp>();
    expectTypeOf<
      NonNullable<Default["subtitleSource"]>
    >().toEqualTypeOf<SourceProp>();
    expectTypeOf<NonNullable<Default["statusSource"]>>().toBeString();
    expectTypeOf<Default["class"]>().toEqualTypeOf<string | undefined>();
  });

  it("they follow an explicit record type", () => {
    type Typed = ApprovalQueueProps<Ticket>;
    expectTypeOf<NonNullable<Typed["titleSource"]>>().toEqualTypeOf<
      SourceProp<Ticket>
    >();
    expectTypeOf<NonNullable<Typed["subtitleSource"]>>().toEqualTypeOf<
      SourceProp<Ticket>
    >();
    expectTypeOf<"owner.email">().toExtend<NonNullable<Typed["titleSource"]>>();
    expectTypeOf<NonNullable<Typed["approverSource"]>>().toEqualTypeOf<
      "id" | "summary" | "owner" | "state"
    >();
  });

  it("a key that is not on the record is rejected", () => {
    const wrongTitle: ApprovalQueueProps<Ticket> = {
      // @ts-expect-error `subject` is not a path of Ticket
      titleSource: "subject",
    };
    const wrongSubtitle: ApprovalQueueProps<Ticket> = {
      // @ts-expect-error `owner.phone` is not a path of Ticket
      subtitleSource: "owner.phone",
    };
    expectTypeOf(wrongTitle).not.toBeAny();
    expectTypeOf(wrongSubtitle).not.toBeAny();
  });
});
