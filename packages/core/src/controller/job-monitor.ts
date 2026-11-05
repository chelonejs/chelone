/**
 * Pure rules behind a job monitor's Retry and Cancel buttons, so every adapter
 * offers them on the same jobs and writes the same patch.
 *
 * These are UI rules, not security ones: the server has to refuse a retry of a
 * job that is not failed. Retry writes only the status; the worker counts
 * attempts.
 */

import type { Identifier } from "../resource/identifier";
import type { ResourceRecord } from "../resource/record";
import { getAllowedTransitions } from "./record-workflow";

/** The monitor's tabs, in order. One `buildKanbanBuckets` column per status. */
export const DEFAULT_JOB_TABS = [
  "running",
  "queued",
  "failed",
  "done",
] as const;

export interface JobActionOptions<TRecord extends object> {
  /** Record field holding the job status, a top-level key. Default `"status"`. */
  statusSource?: keyof TRecord & string;
  /** Statuses a job can be retried from. Default `["failed"]`. */
  retryFrom?: readonly string[];
  /** Statuses a job can be cancelled from. Default `["running", "queued"]`. */
  cancelFrom?: readonly string[];
  /** Status Retry writes. Default `"queued"`. */
  retryValue?: string;
  /** Status Cancel writes. Default `"cancelled"`. */
  cancelValue?: string;
}

export interface JobActions {
  /** The job's status as a string; `""` when it has none. */
  status: string;
  canRetry: boolean;
  canCancel: boolean;
}

/** The arguments of one `update` call, ready to hand to a data provider. */
export interface JobPlan<TRecord> {
  id: Identifier;
  data: Record<string, string>;
  previousData: TRecord;
}

function canMove<TRecord extends object>(
  record: TRecord & object,
  source: keyof TRecord & string,
  from: readonly string[],
  to: string,
) {
  const transitions = Object.fromEntries(from.map((status) => [status, [to]]));
  const { current, allowed } = getAllowedTransitions(record, {
    source,
    transitions,
  });
  return { status: current, allowed: allowed.includes(to) };
}

export function getJobActions<TRecord extends object>(
  record: TRecord & object,
  options: JobActionOptions<TRecord> = {},
): JobActions {
  const {
    statusSource = "status" as keyof TRecord & string,
    retryFrom = ["failed"],
    cancelFrom = ["running", "queued"],
    retryValue = "queued",
    cancelValue = "cancelled",
  } = options;
  const retry = canMove(record, statusSource, retryFrom, retryValue);
  const cancel = canMove(record, statusSource, cancelFrom, cancelValue);
  return {
    status: retry.status,
    canRetry: retry.allowed,
    canCancel: cancel.allowed,
  };
}

function plan<TRecord extends ResourceRecord>(
  record: TRecord,
  source: string,
  value: string,
  allowed: boolean,
): JobPlan<TRecord> | null {
  if (!allowed) return null;
  return { id: record.id, data: { [source]: value }, previousData: record };
}

/** The `update` that retries the job, or `null` when it cannot be retried. */
export function planJobRetry<TRecord extends ResourceRecord = ResourceRecord>(
  record: TRecord,
  options: JobActionOptions<TRecord> = {},
): JobPlan<TRecord> | null {
  const { statusSource = "status", retryValue = "queued" } = options;
  return plan(
    record,
    statusSource,
    retryValue,
    getJobActions(record, options).canRetry,
  );
}

/** The `update` that cancels the job, or `null` when it cannot be cancelled. */
export function planJobCancel<TRecord extends ResourceRecord = ResourceRecord>(
  record: TRecord,
  options: JobActionOptions<TRecord> = {},
): JobPlan<TRecord> | null {
  const { statusSource = "status", cancelValue = "cancelled" } = options;
  return plan(
    record,
    statusSource,
    cancelValue,
    getJobActions(record, options).canCancel,
  );
}
