import { describe, expectTypeOf, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import {
  DEFAULT_JOB_TABS,
  getJobActions,
  type JobActionOptions,
  planJobCancel,
  planJobRetry,
} from "./job-monitor";

interface Job {
  id: number;
  state: string;
  payload: { kind: string };
}

declare const job: Job;
declare const loose: LooseRecord;

describe("job monitor types", () => {
  it("statusSource is a top-level key of the record", () => {
    getJobActions(job, { statusSource: "state" });
    planJobRetry(job, { statusSource: "state" });
    planJobCancel(job, { statusSource: "state" });
    expectTypeOf<JobActionOptions<Job>["statusSource"]>().toEqualTypeOf<
      "id" | "state" | "payload" | undefined
    >();
    expectTypeOf(DEFAULT_JOB_TABS).toEqualTypeOf<
      readonly ["running", "queued", "failed", "done"]
    >();
  });

  it("a key that is not on the record is rejected", () => {
    // @ts-expect-error `status` is not a key of Job
    getJobActions(job, { statusSource: "status" });
    // @ts-expect-error `status` is not a key of Job
    planJobRetry(job, { statusSource: "status" });
    // @ts-expect-error `status` is not a key of Job
    planJobCancel(job, { statusSource: "status" });
    // @ts-expect-error a nested path is not a top-level key
    getJobActions(job, { statusSource: "payload.kind" });
  });

  it("a loose record takes any string", () => {
    getJobActions(loose, { statusSource: "whatever" });
    planJobRetry(loose, { statusSource: "whatever" });
    planJobCancel(loose, { statusSource: "whatever" });
    expectTypeOf<JobActionOptions<LooseRecord>["statusSource"]>().toEqualTypeOf<
      string | undefined
    >();
  });
});
