import { describe, expect, it, vi } from "vitest";
import {
  createFormGroups,
  type GroupFieldMeta,
  reduceGroupState,
} from "./form-groups";

/** A minimal FieldMeta-shaped object for reducer tests (only the read fields). */
function meta(overrides: {
  isValid?: boolean;
  isDirty?: boolean;
  isTouched?: boolean;
  isValidating?: boolean;
  errorMap?: Record<string, unknown>;
}): GroupFieldMeta {
  return {
    isValid: overrides.isValid ?? true,
    isDirty: overrides.isDirty ?? false,
    isTouched: overrides.isTouched ?? false,
    isValidating: overrides.isValidating ?? false,
    errorMap: overrides.errorMap ?? {},
  };
}

describe("createFormGroups (registry)", () => {
  it("registers a source into a group and lists its members", () => {
    const groups = createFormGroups();
    groups.register("tab-general", "title");
    groups.register("tab-general", "body");
    expect(groups.getMembers("tab-general")).toEqual(["title", "body"]);
  });

  it("returns [] for an unknown group", () => {
    const groups = createFormGroups();
    expect(groups.getMembers("nope")).toEqual([]);
  });

  it("dedupes a repeated (group, source) registration without notifying", () => {
    const groups = createFormGroups();
    const listener = vi.fn();
    groups.subscribe(listener);
    groups.register("g", "a");
    expect(listener).toHaveBeenCalledTimes(1);
    groups.register("g", "a");
    // No membership change → no second notify.
    expect(listener).toHaveBeenCalledTimes(1);
    expect(groups.getMembers("g")).toEqual(["a"]);
  });

  it("unregister removes one source and notifies", () => {
    const groups = createFormGroups();
    groups.register("g", "a");
    groups.register("g", "b");
    const listener = vi.fn();
    groups.subscribe(listener);
    groups.unregister("g", "a");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(groups.getMembers("g")).toEqual(["b"]);
  });

  it("unregister of an absent (group, source) is a no-op, no notify", () => {
    const groups = createFormGroups();
    groups.register("g", "a");
    const listener = vi.fn();
    groups.subscribe(listener);
    groups.unregister("g", "absent");
    groups.unregister("absent-group", "a");
    expect(listener).not.toHaveBeenCalled();
  });

  it("drops an emptied group so getMembers returns []", () => {
    const groups = createFormGroups();
    groups.register("g", "a");
    groups.unregister("g", "a");
    expect(groups.getMembers("g")).toEqual([]);
  });

  it("getMembers returns a stable reference until membership changes", () => {
    const groups = createFormGroups();
    groups.register("g", "a");
    const first = groups.getMembers("g");
    const second = groups.getMembers("g");
    expect(second).toBe(first);
    groups.register("g", "b");
    expect(groups.getMembers("g")).not.toBe(first);
  });

  it("notifies multiple listeners and unsubscribe is idempotent", () => {
    const groups = createFormGroups();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = groups.subscribe(a);
    groups.subscribe(b);
    groups.register("g", "x");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    unsubA();
    unsubA(); // idempotent
    groups.register("g", "y");
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it("tracks the same source across two groups independently", () => {
    const groups = createFormGroups();
    groups.register("g1", "shared");
    groups.register("g2", "shared");
    groups.unregister("g1", "shared");
    expect(groups.getMembers("g1")).toEqual([]);
    expect(groups.getMembers("g2")).toEqual(["shared"]);
  });
});

describe("reduceGroupState (pure reducer)", () => {
  it("empty membership → valid, not-dirty, not-touched, no errors", () => {
    const result = reduceGroupState({}, []);
    expect(result).toEqual({
      isValid: true,
      isDirty: false,
      isTouched: false,
      isValidating: false,
      errors: {},
    });
  });

  it("all members valid → isValid true (AND)", () => {
    const fieldMeta = {
      title: meta({ isValid: true }),
      body: meta({ isValid: true }),
    };
    expect(reduceGroupState(fieldMeta, ["title", "body"]).isValid).toBe(true);
  });

  it("one invalid member → isValid false (AND)", () => {
    const fieldMeta = {
      title: meta({ isValid: true }),
      body: meta({
        isValid: false,
        errorMap: { onDynamic: "Required" },
      }),
    };
    const result = reduceGroupState(fieldMeta, ["title", "body"]);
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual({ body: "Required" });
  });

  it("isDirty is OR across members", () => {
    const fieldMeta = {
      a: meta({ isDirty: false }),
      b: meta({ isDirty: true }),
    };
    expect(reduceGroupState(fieldMeta, ["a", "b"]).isDirty).toBe(true);
    expect(
      reduceGroupState({ a: meta({ isDirty: false }) }, ["a"]).isDirty,
    ).toBe(false);
  });

  it("isTouched is OR across members", () => {
    const fieldMeta = {
      a: meta({ isTouched: true }),
      b: meta({ isTouched: false }),
    };
    expect(reduceGroupState(fieldMeta, ["a", "b"]).isTouched).toBe(true);
  });

  it("isValidating is OR across members", () => {
    const fieldMeta = {
      a: meta({ isValidating: false }),
      b: meta({ isValidating: true }),
    };
    expect(reduceGroupState(fieldMeta, ["a", "b"]).isValidating).toBe(true);
  });

  it("a member with no fieldMeta entry is treated as valid/clean (unmounted field)", () => {
    // A registered member whose field hasn't produced meta yet must not flip
    // the group invalid — it simply contributes nothing.
    const fieldMeta = { title: meta({ isValid: true }) };
    const result = reduceGroupState(fieldMeta, ["title", "not-yet-mounted"]);
    expect(result.isValid).toBe(true);
    expect(result.isDirty).toBe(false);
    expect(result.errors).toEqual({});
  });

  it("collects the first displayable error per invalid member keyed by source", () => {
    const fieldMeta = {
      title: meta({
        isValid: false,
        errorMap: { onDynamic: "Too short", onSubmit: "Server said no" },
      }),
      body: meta({ isValid: true }),
      slug: meta({
        isValid: false,
        errorMap: { onSubmit: "Slug taken" },
      }),
    };
    const result = reduceGroupState(fieldMeta, ["title", "body", "slug"]);
    // onSubmit takes priority over onDynamic (server/submit first).
    expect(result.errors).toEqual({
      title: "Server said no",
      slug: "Slug taken",
    });
  });

  it("an invalid member with no displayable message still flips isValid but omits from errors", () => {
    const fieldMeta = {
      title: meta({ isValid: false, errorMap: {} }),
    };
    const result = reduceGroupState(fieldMeta, ["title"]);
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual({});
  });
});
