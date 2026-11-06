import type { SourceKey, SourceProp } from "@chelone/core";
import { assertType, describe, expectTypeOf, it } from "vitest";
import type { JobMonitorProps } from "./job-monitor.vue";

// A type alias: an interface has no index signature, so it does not satisfy
// the monitor's `LooseRecord` constraint.
type Ticket = {
  id: number;
  status: string;
  kind: string;
  lastError: string | null;
};

type SourcesOf<P> = Required<
  Pick<
    P,
    Extract<
      keyof P,
      | "statusSource"
      | "typeSource"
      | "payloadSource"
      | "errorSource"
      | "attemptsSource"
      | "createdAtSource"
    >
  >
>;

describe("JobMonitor source props", () => {
  it("statusSource is a SourceKey and the other sources are SourceProp", () => {
    type Loose = SourcesOf<JobMonitorProps>;
    expectTypeOf<Loose["statusSource"]>().toEqualTypeOf<string>();
    expectTypeOf<Loose["typeSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Loose["payloadSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Loose["errorSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Loose["attemptsSource"]>().toEqualTypeOf<SourceProp>();
    expectTypeOf<Loose["createdAtSource"]>().toEqualTypeOf<SourceProp>();
  });

  it("they follow an explicit record type", () => {
    assertType<SourcesOf<JobMonitorProps<Ticket>>>({
      statusSource: "kind",
      typeSource: "kind",
      payloadSource: "lastError",
      errorSource: "lastError",
      attemptsSource: "id",
      createdAtSource: "id",
    });
    type Status = SourcesOf<JobMonitorProps<Ticket>>["statusSource"];
    expectTypeOf<Status>().toEqualTypeOf<SourceKey<Ticket>>();
    expectTypeOf<Status>().toEqualTypeOf<
      "id" | "status" | "kind" | "lastError"
    >();
    expectTypeOf<
      SourcesOf<JobMonitorProps<Ticket>>["errorSource"]
    >().toEqualTypeOf<SourceProp<Ticket>>();
  });

  it("a key that is not on the record is rejected", () => {
    assertType<Pick<JobMonitorProps<Ticket>, "statusSource">>({
      // @ts-expect-error `state` is not a key of Ticket
      statusSource: "state",
    });
    assertType<Pick<JobMonitorProps<Ticket>, "typeSource">>({
      // @ts-expect-error `type` is not a path of Ticket
      typeSource: "type",
    });
    assertType<Pick<JobMonitorProps<Ticket>, "errorSource">>({
      // @ts-expect-error `message` is not a path of Ticket
      errorSource: "message",
    });
  });
});
