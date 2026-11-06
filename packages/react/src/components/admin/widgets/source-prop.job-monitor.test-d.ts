import type { SourceKey, SourceProp } from "@chelone/core";
import { describe, expectTypeOf, it } from "vitest";
import type { JobMonitorProps } from "./job-monitor";

// A type alias: an interface has no index signature, so it does not satisfy
// the monitor's `LooseRecord` constraint.
type Job = {
  id: number;
  status: string;
  kind: string;
  lastError: string | null;
};

describe("JobMonitor source props", () => {
  it("statusSource is a SourceKey and the other sources are SourceProp", () => {
    expectTypeOf<JobMonitorProps["statusSource"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<JobMonitorProps["typeSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<JobMonitorProps["payloadSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<JobMonitorProps["errorSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<JobMonitorProps["attemptsSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
    expectTypeOf<JobMonitorProps["createdAtSource"]>().toEqualTypeOf<
      SourceProp | undefined
    >();
  });

  it("they follow an explicit record type", () => {
    expectTypeOf<JobMonitorProps<Job>["statusSource"]>().toEqualTypeOf<
      SourceKey<Job> | undefined
    >();
    expectTypeOf<
      NonNullable<JobMonitorProps<Job>["statusSource"]>
    >().toEqualTypeOf<"id" | "status" | "kind" | "lastError">();
    expectTypeOf<JobMonitorProps<Job>["typeSource"]>().toEqualTypeOf<
      SourceProp<Job> | undefined
    >();
    expectTypeOf<JobMonitorProps<Job>["errorSource"]>().toEqualTypeOf<
      SourceProp<Job> | undefined
    >();
  });

  it("a key that is not on the record is rejected", () => {
    const status: JobMonitorProps<Job> = {
      // @ts-expect-error `state` is not a key of Job
      statusSource: "state",
    };
    const type: JobMonitorProps<Job> = {
      // @ts-expect-error `type` is not a path of Job
      typeSource: "type",
    };
    const error: JobMonitorProps<Job> = {
      // @ts-expect-error `message` is not a path of Job
      errorSource: "message",
    };
    expectTypeOf(status).not.toBeAny();
    expectTypeOf(type).not.toBeAny();
    expectTypeOf(error).not.toBeAny();
  });
});
