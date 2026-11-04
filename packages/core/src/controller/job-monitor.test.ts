import { describe, expect, it } from "vitest";
import type { LooseRecord } from "../resource/record";
import {
  getJobActions,
  type JobActionOptions,
  planJobCancel,
  planJobRetry,
} from "./job-monitor";

describe("getJobActions", () => {
  it("a failed job can be retried and not cancelled", () => {
    expect(getJobActions({ id: 1, status: "failed" })).toEqual({
      status: "failed",
      canRetry: true,
      canCancel: false,
    });
  });

  it("a running or queued job can be cancelled and not retried", () => {
    for (const status of ["running", "queued"]) {
      expect(getJobActions({ id: 1, status })).toEqual({
        status,
        canRetry: false,
        canCancel: true,
      });
    }
  });

  it("a done job, a missing status or an unknown status allows neither", () => {
    for (const record of [
      { id: 1, status: "done" },
      { id: 1 },
      { id: 1, status: null },
      { id: 1, status: "exploded" },
      { id: 1, status: "constructor" },
    ]) {
      const actions = getJobActions(record);
      expect(actions.canRetry).toBe(false);
      expect(actions.canCancel).toBe(false);
    }
    expect(getJobActions({ id: 1 }).status).toBe("");
    expect(getJobActions({ id: 1, status: null }).status).toBe("");
  });

  it("retryFrom and cancelFrom replace the defaults", () => {
    const options: JobActionOptions<LooseRecord> = {
      statusSource: "state",
      retryFrom: ["dead", "failed"],
      cancelFrom: ["waiting"],
    };
    expect(getJobActions({ id: 1, state: "dead" }, options)).toEqual({
      status: "dead",
      canRetry: true,
      canCancel: false,
    });
    expect(getJobActions({ id: 1, state: "waiting" }, options)).toEqual({
      status: "waiting",
      canRetry: false,
      canCancel: true,
    });
    expect(getJobActions({ id: 1, state: "running" }, options)).toEqual({
      status: "running",
      canRetry: false,
      canCancel: false,
    });
    expect(getJobActions({ id: 1, status: "failed" }, options).status).toBe("");
  });

  it("reads the status through the source key, not the default", () => {
    expect(
      getJobActions(
        { id: 1, status: "failed", state: "done" },
        {
          statusSource: "state",
        },
      ).canRetry,
    ).toBe(false);
  });
});

describe("planJobRetry", () => {
  it("writes retryValue to the status source and keeps the record as previousData", () => {
    const record = { id: 7, status: "failed", attempts: 2 };
    const plan = planJobRetry(record);
    expect(plan).toEqual({
      id: 7,
      data: { status: "queued" },
      previousData: { id: 7, status: "failed", attempts: 2 },
    });
    expect(plan?.previousData).toBe(record);
    expect(
      planJobRetry(
        { id: "a", state: "dead" },
        { statusSource: "state", retryFrom: ["dead"], retryValue: "pending" },
      ),
    ).toEqual({
      id: "a",
      data: { state: "pending" },
      previousData: { id: "a", state: "dead" },
    });
  });

  it("returns null for a job that cannot be retried", () => {
    for (const status of [
      "running",
      "queued",
      "done",
      "cancelled",
      undefined,
    ]) {
      expect(planJobRetry({ id: 1, status })).toBeNull();
    }
  });
});

describe("planJobCancel", () => {
  it("writes cancelValue to the status source and keeps the record as previousData", () => {
    const record = { id: 3, status: "running" };
    const plan = planJobCancel(record);
    expect(plan).toEqual({
      id: 3,
      data: { status: "cancelled" },
      previousData: { id: 3, status: "running" },
    });
    expect(plan?.previousData).toBe(record);
    expect(
      planJobCancel(
        { id: 4, state: "waiting" },
        { statusSource: "state", cancelFrom: ["waiting"], cancelValue: "void" },
      ),
    ).toEqual({
      id: 4,
      data: { state: "void" },
      previousData: { id: 4, state: "waiting" },
    });
  });

  it("returns null for a job that cannot be cancelled", () => {
    for (const status of ["failed", "done", "cancelled", undefined]) {
      expect(planJobCancel({ id: 1, status })).toBeNull();
    }
  });

  it("does not mutate the record", () => {
    const record = Object.freeze({ id: 3, status: "queued" });
    const options = Object.freeze({
      retryFrom: Object.freeze(["failed"]),
      cancelFrom: Object.freeze(["queued"]),
    });
    expect(() => planJobCancel(record, options)).not.toThrow();
    expect(() => planJobRetry(record, options)).not.toThrow();
    expect(record).toEqual({ id: 3, status: "queued" });
    expect(options.cancelFrom).toEqual(["queued"]);
  });
});
