/**
 * FormGroups primitive (P6 W2-T1, plan §0c item 3 / decision D6c).
 *
 * form-core 1.33's `FieldGroupApi` state is `{values}` only (no validity
 * aggregation) and `FormGroupApi` is a nested-field validator — NEITHER is a
 * validity aggregator for tab/step badges. So Chelone BUILDS groups thin: a
 * framework-agnostic string-membership registry (this file) + a pure reducer
 * over `form.store.state.fieldMeta` → aggregated `{isValid, isDirty, isTouched,
 * isValidating, errors}`. The React layer (`group-hooks.tsx`) subscribes the
 * form store for a group's members and re-runs the reducer with value-equality
 * so editing an unrelated field never re-renders a group badge.
 *
 * Vanilla + SSR-safe: no `window`, no React, no router/form library import at
 * runtime — mirrors the resource-registry / MicroStore notification pattern.
 */

import type { ValidationErrorMap } from "@tanstack/form-core";
import { firstFieldError } from "./field-error";
import type { ValidationErrorMessage } from "./form-errors";

/** Called on every membership mutation (a member added or removed). */
export type FormGroupsListener = () => void;

/** The vanilla form-group membership registry contract. */
export interface FormGroups {
  /**
   * Add `source` to `group`. De-duplicated: registering a `(group, source)`
   * pair already present is a no-op and does NOT notify — critical for the
   * React register-on-render pattern (an input re-registering each render must
   * not churn subscribers). Insertion order is preserved.
   */
  register(group: string, source: string): void;
  /** Remove `source` from `group`. Absent pair → no-op, no notify. Emptied groups are dropped. */
  unregister(group: string, source: string): void;
  /**
   * The current member sources for `group`, in registration order. Empty
   * groups return a shared empty array. Reference-STABLE until that group's
   * membership actually changes (useSyncExternalStore-compatible).
   */
  getMembers(group: string): readonly string[];
  /** Subscribe to membership mutations; returns an idempotent unsubscribe. */
  subscribe(listener: FormGroupsListener): () => void;
}

/** Shared empty snapshot so unknown/empty groups return a stable reference. */
const EMPTY_MEMBERS: readonly string[] = Object.freeze([]);

export function createFormGroups(): FormGroups {
  /** group → ordered set of member sources. */
  const groups = new Map<string, Set<string>>();
  const listeners = new Set<FormGroupsListener>();
  /** Per-group cached snapshot; invalidated (deleted) on that group's mutation. */
  const snapshots = new Map<string, readonly string[]>();

  const notify = (group: string): void => {
    snapshots.delete(group); // invalidate before notifying so reads are fresh
    for (const listener of listeners) listener();
  };

  return {
    register(group, source) {
      let members = groups.get(group);
      if (members?.has(source)) return; // de-dupe: no change, no notify
      if (!members) {
        members = new Set<string>();
        groups.set(group, members);
      }
      members.add(source);
      notify(group);
    },
    unregister(group, source) {
      const members = groups.get(group);
      if (!members?.delete(source)) return; // absent → no-op, no notify
      if (members.size === 0) groups.delete(group);
      notify(group);
    },
    getMembers(group) {
      const members = groups.get(group);
      if (!members || members.size === 0) return EMPTY_MEMBERS;
      const cached = snapshots.get(group);
      if (cached) return cached;
      const snapshot = Object.freeze([...members]);
      snapshots.set(group, snapshot);
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        // Idempotent: a second call must not affect other subscribers.
        listeners.delete(listener);
      };
    },
  };
}

/**
 * The per-field metadata shape the reducer reads — the subset of form-core's
 * `FieldMeta` (form-core 1.33) that a group badge aggregates. Every field a
 * form knows about carries this under `form.store.state.fieldMeta[source]`.
 */
export interface GroupFieldMeta {
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  /** form-core's cause-keyed validation errors (`onSubmit`/`onDynamic`/…). */
  errorMap: ValidationErrorMap;
}

/** The aggregated group state a badge/toolbar renders. */
export interface GroupState {
  /** AND over members: false as soon as any member is invalid. */
  isValid: boolean;
  /** OR over members: true if any member has been modified. */
  isDirty: boolean;
  /** OR over members: true if any member has been touched. */
  isTouched: boolean;
  /** OR over members: true if any member is validating async. */
  isValidating: boolean;
  /** First displayable error per invalid member, keyed by source. */
  errors: Record<string, ValidationErrorMessage>;
}

/**
 * Pure reducer: aggregate a group's member fields into a badge-ready
 * {@link GroupState}. A member with NO `fieldMeta` entry (a registered field
 * not yet mounted) contributes nothing — it is treated as valid + clean, so a
 * pending mount never flips the group invalid. `isValid` is an AND (any invalid
 * member fails the group); `isDirty`/`isTouched`/`isValidating` are ORs.
 * `errors` collects the first displayable message per invalid member.
 */
export function reduceGroupState(
  fieldMeta: Record<string, GroupFieldMeta | undefined>,
  members: readonly string[],
): GroupState {
  let isValid = true;
  let isDirty = false;
  let isTouched = false;
  let isValidating = false;
  const errors: Record<string, ValidationErrorMessage> = {};

  for (const source of members) {
    const meta = fieldMeta[source];
    if (!meta) continue; // unmounted member → contributes nothing
    if (meta.isDirty) isDirty = true;
    if (meta.isTouched) isTouched = true;
    if (meta.isValidating) isValidating = true;
    if (!meta.isValid) {
      isValid = false;
      const error = firstFieldError(meta.errorMap);
      if (error !== undefined) errors[source] = error;
    }
  }

  return { isValid, isDirty, isTouched, isValidating, errors };
}
