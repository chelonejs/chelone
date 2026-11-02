/**
 * Pure rules behind an approval button and a status-transition button, so
 * every adapter decides the same way.
 *
 * These are UI rules, not security ones: the approvers list is a field on the
 * record that the caller writes back whole, so two approvers acting at once
 * can overwrite each other. The server has to enforce the count and who may
 * approve.
 */

type Id = string | number;

export interface ApprovalOptions {
  /** Record field holding the approver list. Default `"approvers"`. */
  approverSource?: string;
  /** Approvals needed. Floored, minimum 1; `NaN` reads as 2. Default 2. */
  required?: number;
  /** The current user. No identity means nobody can approve. */
  identityId?: Id | null;
  /** Record field `buildApprovalUpdate` writes the status to. Default `"status"`. */
  statusSource?: string;
  /** Status written while approvals are short of `required`. Default `"pending"`. */
  pendingValue?: unknown;
  /** Status written once approvals reach `required`. Default `"approved"`. */
  approvedValue?: unknown;
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

export interface TransitionOptions {
  /** Record field holding the status. Default `"status"`. */
  source?: string;
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

function storedItems(record: Record<string, unknown>, source: string) {
  const value = record[source];
  return Array.isArray(value) ? (value as unknown[]) : [];
}

export function getApprovalState(
  record: Record<string, unknown>,
  options: ApprovalOptions = {},
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
export function buildApprovalUpdate(
  record: Record<string, unknown>,
  options: ApprovalOptions = {},
): Record<string, unknown> | null {
  const {
    approverSource = "approvers",
    statusSource = "status",
    identityId,
    pendingValue = "pending",
    approvedValue = "approved",
  } = options;
  const state = getApprovalState(record, options);
  if (!state.canApprove || identityId === undefined || identityId === null) {
    return null;
  }
  return {
    [approverSource]: [...storedItems(record, approverSource), identityId],
    [statusSource]:
      state.count + 1 >= state.required ? approvedValue : pendingValue,
  };
}

export function getAllowedTransitions(
  record: Record<string, unknown>,
  options: TransitionOptions,
): AllowedTransitions {
  const { source = "status", transitions, guards } = options;
  const current = String(record[source] ?? "");
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
