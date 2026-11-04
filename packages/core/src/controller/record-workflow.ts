/**
 * Pure rules behind an approval button and a status-transition button, so
 * every adapter decides the same way.
 *
 * These are UI rules, not security ones: the approvers list is a field on the
 * record that the caller writes back whole, so two approvers acting at once
 * can overwrite each other. The server has to enforce the count and who may
 * approve.
 */

import type { SourceKey } from "../resource/source-path";

type Id = string | number;

export interface ApprovalOptions<TRecord = Record<string, unknown>> {
  /**
   * Record field holding the approver list, a top-level key: it is read as
   * `record[approverSource]` and written back whole. Default `"approvers"`.
   */
  approverSource?: SourceKey<TRecord>;
  /** Approvals needed. Floored, minimum 1; `NaN` reads as 2. Default 2. */
  required?: number;
  /** The current user. No identity means nobody can approve. */
  identityId?: Id | null;
  /**
   * Record field `buildApprovalUpdate` writes the status to, a top-level key.
   * Default `"status"`.
   */
  statusSource?: SourceKey<TRecord>;
  /** Status written while approvals are short of `required`. Default `"pending"`. */
  pendingValue?: unknown;
  /** Status written once approvals reach `required`. Default `"approved"`. */
  approvedValue?: unknown;
}

/**
 * What `buildApprovalUpdate` takes. `statusSource` is a write target, and a
 * record often has no status field until its first approval, so it takes any
 * string; `approverSource` is read, so it stays a key of the record.
 */
export type ApprovalUpdateOptions<TRecord = Record<string, unknown>> = Omit<
  ApprovalOptions<TRecord>,
  "statusSource"
> & {
  /** Record field the status is written to. Default `"status"`. */
  statusSource?: string;
};

export interface ApprovalState {
  /** Distinct approver ids, as strings. */
  approvers: string[];
  count: number;
  required: number;
  hasApproved: boolean;
  isComplete: boolean;
  canApprove: boolean;
}

export interface TransitionOptions<TRecord = Record<string, unknown>> {
  /** Record field holding the status, a top-level key. Default `"status"`. */
  source?: SourceKey<TRecord>;
  /** Next states by current state. */
  transitions: Record<string, readonly string[]>;
  /** Predicates keyed `"<from>-><to>"`. A transition with no guard is allowed. */
  guards?: Record<string, (record: Record<string, unknown>) => boolean>;
}

export interface AllowedTransitions {
  current: string;
  allowed: string[];
}

const hasOwn = (obj: object, key: string): boolean => Object.hasOwn(obj, key);

function normalizeRequired(required: number | undefined): number {
  if (required === undefined || Number.isNaN(required)) return 2;
  return Math.max(1, Math.floor(required));
}

function storedItems(record: object, source: string) {
  const value = (record as Record<string, unknown>)[source];
  return Array.isArray(value) ? (value as unknown[]) : [];
}

export function getApprovalState<TRecord = Record<string, unknown>>(
  record: TRecord & object,
  options: ApprovalOptions<TRecord> = {},
): ApprovalState {
  const { approverSource = "approvers", identityId } = options;
  const required = normalizeRequired(options.required);
  const approvers = [
    ...new Set(storedItems(record, approverSource).map((item) => String(item))),
  ];
  const count = approvers.length;
  const hasIdentity = identityId !== undefined && identityId !== null;
  const hasApproved = hasIdentity && approvers.includes(String(identityId));
  const isComplete = count >= required;
  return {
    approvers,
    count,
    required,
    hasApproved,
    isComplete,
    canApprove: hasIdentity && !hasApproved && !isComplete,
  };
}

/**
 * The patch that records `identityId`'s approval, or `null` when they cannot
 * approve. Stored items stay as they were and the identity is appended in its
 * own type.
 */
export function buildApprovalUpdate<TRecord = Record<string, unknown>>(
  record: TRecord & object,
  options: ApprovalUpdateOptions<TRecord> = {},
): Record<string, unknown> | null {
  const {
    approverSource = "approvers",
    statusSource = "status",
    identityId,
    pendingValue = "pending",
    approvedValue = "approved",
  } = options;
  const state = getApprovalState(record, {
    approverSource: options.approverSource,
    required: options.required,
    identityId,
  });
  if (!state.canApprove || identityId === undefined || identityId === null) {
    return null;
  }
  return {
    [approverSource]: [...storedItems(record, approverSource), identityId],
    [statusSource]:
      state.count + 1 >= state.required ? approvedValue : pendingValue,
  };
}

export function getAllowedTransitions<TRecord = Record<string, unknown>>(
  record: TRecord & object,
  options: TransitionOptions<TRecord>,
): AllowedTransitions {
  const { source = "status", transitions, guards } = options;
  const current = String((record as Record<string, unknown>)[source] ?? "");
  const next = hasOwn(transitions, current) ? transitions[current] : undefined;
  const allowed: string[] = [];
  for (const to of Array.isArray(next) ? next : []) {
    if (allowed.includes(to)) continue;
    const key = `${current}->${to}`;
    const guard = guards && hasOwn(guards, key) ? guards[key] : undefined;
    if (guard) {
      try {
        if (!guard(record as Record<string, unknown>)) continue;
      } catch {
        continue;
      }
    }
    allowed.push(to);
  }
  return { current, allowed };
}
