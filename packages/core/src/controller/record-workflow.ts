/**
 * Pure rules behind an approval button, a rejection button and a
 * status-transition button, so every adapter decides the same way.
 *
 * These are UI rules, not security ones: the approvers list is a field on the
 * record that the caller writes back whole, so two approvers acting at once
 * can overwrite each other. The server has to enforce the count and who may
 * approve or reject.
 */

type Id = string | number;

export interface ApprovalOptions<TRecord extends object> {
  /**
   * Record field holding the approver list, a top-level key: it is read as
   * `record[approverSource]` and written back whole. Default `"approvers"`.
   */
  approverSource?: keyof TRecord & string;
  /** Approvals needed. Floored, minimum 1; `NaN` reads as 2. Default 2. */
  required?: number;
  /** The current user. No identity means nobody can approve. */
  identityId?: Id | null;
  /**
   * Record field `buildApprovalUpdate` writes the status to, a top-level key.
   * Default `"status"`.
   */
  statusSource?: keyof TRecord & string;
  /** Status written while approvals are short of `required`. Default `"pending"`. */
  pendingValue?: string;
  /** Status written once approvals reach `required`. Default `"approved"`. */
  approvedValue?: string;
}

/**
 * What `buildApprovalUpdate` takes. `statusSource` is a write target, and a
 * record often has no status field until its first approval, so it takes any
 * string; `approverSource` is read, so it stays a key of the record.
 */
export type ApprovalUpdateOptions<TRecord extends object> = Omit<
  ApprovalOptions<TRecord>,
  "statusSource"
> & {
  /** Record field the status is written to. Default `"status"`. */
  statusSource?: string;
};

export interface RejectionOptions {
  /** The current user. No identity means nobody can reject. */
  identityId?: Id | null;
  /** Record field the status is written to and read from. Default `"status"`. */
  statusSource?: string;
  /** Status written on rejection. Default `"rejected"`. */
  // type-escape: server: a status is whatever the app's column holds (string, number, enum)
  rejectedValue?: unknown;
  /** Record field the reason is written to. Default `"rejectionNote"`. */
  noteSource?: string;
  /** Record field the rejecter's id is written to. Default `"rejectedBy"`. */
  rejectedBySource?: string;
  /** Why the record is rejected. Trimmed; an empty one is written as `null`. */
  reason?: string;
  /** Refuse a rejection whose trimmed reason is empty. Default `false`. */
  requireReason?: boolean;
}

export interface ApprovalState {
  /** Distinct approver ids, as strings. */
  approvers: string[];
  count: number;
  required: number;
  hasApproved: boolean;
  isComplete: boolean;
  canApprove: boolean;
}

export interface TransitionOptions<TRecord extends object> {
  /** Record field holding the status, a top-level key. Default `"status"`. */
  source?: keyof TRecord & string;
  /** Next states by current state. */
  transitions: Record<string, readonly string[]>;
  /** Predicates keyed `"<from>-><to>"`. A transition with no guard is allowed. */
  guards?: Record<string, (record: TRecord) => boolean>;
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

function storedItems<R extends object>(record: R, source: keyof R & string) {
  const value = record[source];
  return Array.isArray(value) ? (value as unknown[]) : [];
}

/**
 * The approver list: `approverSource` when given, else the `"approvers"` field
 * if the record has one. The default is a literal the record's type may not
 * name, so it is read only after an `in` check.
 */
function approverItems<R extends object>(
  record: R,
  approverSource: (keyof R & string) | undefined,
) {
  if (approverSource !== undefined) return storedItems(record, approverSource);
  return "approvers" in record ? storedItems(record, "approvers") : [];
}

export function getApprovalState<TRecord extends object>(
  record: TRecord & object,
  options: ApprovalOptions<TRecord> = {},
): ApprovalState {
  const { approverSource, identityId } = options;
  const required = normalizeRequired(options.required);
  const approvers = [
    ...new Set(
      approverItems(record, approverSource).map((item) => String(item)),
    ),
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
export function buildApprovalUpdate<TRecord extends object>(
  record: TRecord & object,
  options: ApprovalUpdateOptions<TRecord> = {},
): Record<string, unknown> | null {
  const {
    approverSource,
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
    [approverSource ?? "approvers"]: [
      ...approverItems(record, approverSource),
      identityId,
    ],
    [statusSource]:
      state.count + 1 >= state.required ? approvedValue : pendingValue,
  };
}

/**
 * The patch that records `identityId`'s rejection, or `null` when they cannot
 * reject: no identity, a blank reason while `requireReason` is set, or a record
 * whose status already equals `rejectedValue`. All three sources are write
 * targets, so they take any string.
 */
export function buildRejectionUpdate<TRecord extends object>(
  record: TRecord & object,
  options: RejectionOptions = {},
  // type-escape: builder: the patch is keyed by caller-chosen strings, as buildApprovalUpdate's is
): Record<string, unknown> | null {
  const {
    identityId,
    statusSource = "status",
    rejectedValue = "rejected",
    noteSource = "rejectionNote",
    rejectedBySource = "rejectedBy",
    requireReason = false,
  } = options;
  const reason = options.reason?.trim() ?? "";
  if (identityId === undefined || identityId === null) return null;
  if (requireReason && reason === "") return null;
  if (Reflect.get(record, statusSource) === rejectedValue) return null;
  return {
    [statusSource]: rejectedValue,
    [rejectedBySource]: identityId,
    [noteSource]: reason === "" ? null : reason,
  };
}

export function getAllowedTransitions<TRecord extends object>(
  record: TRecord & object,
  options: TransitionOptions<TRecord>,
): AllowedTransitions {
  const { source, transitions, guards } = options;
  const value =
    source !== undefined
      ? record[source]
      : "status" in record
        ? record.status
        : undefined;
  const current = String(value ?? "");
  const next = hasOwn(transitions, current) ? transitions[current] : undefined;
  const allowed: string[] = [];
  for (const to of Array.isArray(next) ? next : []) {
    if (allowed.includes(to)) continue;
    const key = `${current}->${to}`;
    const guard = guards && hasOwn(guards, key) ? guards[key] : undefined;
    if (guard) {
      try {
        if (!guard(record)) continue;
      } catch {
        continue;
      }
    }
    allowed.push(to);
  }
  return { current, allowed };
}
