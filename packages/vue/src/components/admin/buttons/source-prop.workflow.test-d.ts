import { assertType, describe, expectTypeOf, it } from "vitest";
import type { DualApprovalButtonProps } from "./dual-approval-button.vue";
import type { StatusTransitionButtonProps } from "./status-transition-button.vue";

// A type alias: an interface has no index signature, so it does not satisfy
// the buttons' `Record<string, unknown>` constraint.
type Ticket = { id: number; signers: number[]; phase: string };

type SourcesOf<P> = Pick<
  P,
  Extract<keyof P, "approverSource" | "statusSource" | "source">
>;

describe("workflow button source props", () => {
  it("the source props follow an explicit record type", () => {
    assertType<SourcesOf<DualApprovalButtonProps<Ticket>>>({
      approverSource: "signers",
      statusSource: "phase",
    });
    assertType<SourcesOf<StatusTransitionButtonProps<Ticket>>>({
      source: "phase",
    });
    assertType<SourcesOf<DualApprovalButtonProps<Ticket>>>({
      // @ts-expect-error `signer` is not a key of Ticket
      approverSource: "signer",
    });
    assertType<SourcesOf<StatusTransitionButtonProps<Ticket>>>({
      // @ts-expect-error `status` is not a key of Ticket
      source: "status",
    });
    assertType<SourcesOf<DualApprovalButtonProps<Ticket>>>({
      // @ts-expect-error a nested path is not a top-level key
      statusSource: "phase.name",
    });
  });

  it("the default record keeps them a string", () => {
    expectTypeOf<SourcesOf<DualApprovalButtonProps>>().toEqualTypeOf<{
      approverSource?: string;
      statusSource?: string;
    }>();
    expectTypeOf<SourcesOf<StatusTransitionButtonProps>>().toEqualTypeOf<{
      source?: string;
    }>();
  });
});
