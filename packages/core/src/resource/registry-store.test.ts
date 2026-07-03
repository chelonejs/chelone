import { describe, expect, it, vi } from "vitest";
import {
  computeDefinition,
  createResourceRegistry,
  type ResourceDefinition,
} from "./registry-store";

/** A minimal, fully-specified definition for tests. */
const postsDef: ResourceDefinition = {
  name: "posts",
  hasList: true,
  hasCreate: true,
  hasEdit: true,
  hasShow: false,
};

describe("createResourceRegistry", () => {
  it("register + get + getAll expose the definition", () => {
    const registry = createResourceRegistry();
    expect(registry.get("posts")).toBeUndefined();
    expect(registry.getAll()).toEqual({});

    registry.register(postsDef);
    expect(registry.get("posts")).toEqual(postsDef);
    expect(registry.getAll()).toEqual({ posts: postsDef });
  });

  it("unregister removes the definition and notifies", () => {
    const registry = createResourceRegistry();
    const cb = vi.fn();
    registry.register(postsDef);
    registry.subscribe(cb);
    registry.unregister("posts");
    expect(registry.get("posts")).toBeUndefined();
    expect(registry.getAll()).toEqual({});
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("unregister of an absent resource is a no-op and does not notify", () => {
    const registry = createResourceRegistry();
    const cb = vi.fn();
    registry.subscribe(cb);
    registry.unregister("missing");
    expect(cb).not.toHaveBeenCalled();
  });

  it("register notifies subscribers on a NEW resource", () => {
    const registry = createResourceRegistry();
    const cb = vi.fn();
    registry.subscribe(cb);
    registry.register(postsDef);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("register notifies when an EXISTING resource's definition changes", () => {
    const registry = createResourceRegistry();
    registry.register(postsDef);
    const cb = vi.fn();
    registry.subscribe(cb);
    registry.register({ ...postsDef, hasShow: true });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(registry.get("posts")?.hasShow).toBe(true);
  });

  it("isEqual-guarded register: re-registering an equal definition is a no-op and does not notify", () => {
    const registry = createResourceRegistry();
    registry.register(postsDef);
    const cb = vi.fn();
    registry.subscribe(cb);
    // A fresh object with identical fields — deep-equal, different reference.
    registry.register({ ...postsDef });
    expect(cb).not.toHaveBeenCalled();
  });

  it("isEqual guard compares options shallowly (equal options -> no-op)", () => {
    const registry = createResourceRegistry();
    registry.register({ ...postsDef, options: { group: "content" } });
    const cb = vi.fn();
    registry.subscribe(cb);
    registry.register({ ...postsDef, options: { group: "content" } });
    expect(cb).not.toHaveBeenCalled();
  });

  it("isEqual guard detects a changed options field (different group -> notify)", () => {
    const registry = createResourceRegistry();
    registry.register({ ...postsDef, options: { group: "content" } });
    const cb = vi.fn();
    registry.subscribe(cb);
    registry.register({ ...postsDef, options: { group: "admin" } });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("subscribe returns an unsubscribe that stops notifications", () => {
    const registry = createResourceRegistry();
    const cb = vi.fn();
    const unsub = registry.subscribe(cb);
    registry.register(postsDef);
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    registry.unregister("posts");
    expect(cb).toHaveBeenCalledTimes(1); // no further notification
  });

  it("unsubscribe is idempotent (double-call does not disturb other subscribers)", () => {
    const registry = createResourceRegistry();
    const cbA = vi.fn();
    const cbB = vi.fn();
    const unsubA = registry.subscribe(cbA);
    registry.subscribe(cbB);
    unsubA();
    unsubA(); // idempotent
    registry.register(postsDef);
    expect(cbA).not.toHaveBeenCalled();
    expect(cbB).toHaveBeenCalledTimes(1);
  });
});

describe("getAll snapshot stability", () => {
  it("getAll is reference-stable until a mutation", () => {
    const registry = createResourceRegistry();
    registry.register(postsDef);
    const a = registry.getAll();
    expect(registry.getAll()).toBe(a); // stable across reads
    registry.register({ ...postsDef, hasShow: true });
    const b = registry.getAll();
    expect(b).not.toBe(a); // new reference after a real change
  });

  it("a no-op register does NOT churn the snapshot reference", () => {
    const registry = createResourceRegistry();
    registry.register(postsDef);
    const a = registry.getAll();
    registry.register({ ...postsDef }); // deep-equal no-op
    expect(registry.getAll()).toBe(a);
  });

  it("a no-op unregister does NOT churn the snapshot reference", () => {
    const registry = createResourceRegistry();
    registry.register(postsDef);
    const a = registry.getAll();
    registry.unregister("missing");
    expect(registry.getAll()).toBe(a);
  });

  it("does not mutate the previous snapshot in place", () => {
    const registry = createResourceRegistry();
    registry.register(postsDef);
    const a = registry.getAll();
    registry.register({
      name: "comments",
      hasList: true,
      hasCreate: false,
      hasEdit: false,
      hasShow: false,
    });
    // Previous snapshot must still hold only the original entry.
    expect(Object.keys(a)).toEqual(["posts"]);
  });
});

describe("computeDefinition", () => {
  it("derives has* flags from the presence of list/create/edit/show", () => {
    const list = () => "list";
    const create = () => "create";
    expect(computeDefinition({ name: "posts", list, create })).toEqual({
      name: "posts",
      hasList: true,
      hasCreate: true,
      hasEdit: false,
      hasShow: false,
      icon: undefined,
      recordRepresentation: undefined,
      options: undefined,
    });
  });

  it("all four routes present -> all flags true", () => {
    const def = computeDefinition({
      name: "posts",
      list: () => null,
      create: () => null,
      edit: () => null,
      show: () => null,
    });
    expect(def.hasList).toBe(true);
    expect(def.hasCreate).toBe(true);
    expect(def.hasEdit).toBe(true);
    expect(def.hasShow).toBe(true);
  });

  it("no routes present -> all flags false", () => {
    const def = computeDefinition({ name: "posts" });
    expect(def.hasList).toBe(false);
    expect(def.hasCreate).toBe(false);
    expect(def.hasEdit).toBe(false);
    expect(def.hasShow).toBe(false);
  });

  it("explicit has* flags override / supplement missing components (hasList=!!list||!!hasList)", () => {
    const def = computeDefinition({
      name: "posts",
      hasList: true,
      hasEdit: true,
    });
    expect(def.hasList).toBe(true);
    expect(def.hasEdit).toBe(true);
    expect(def.hasCreate).toBe(false);
    expect(def.hasShow).toBe(false);
  });

  it("a present component wins even when the explicit flag is false", () => {
    const def = computeDefinition({
      name: "posts",
      list: () => null,
      hasList: false,
    });
    expect(def.hasList).toBe(true); // !!list || !!hasList
  });

  it("passes through icon, recordRepresentation, and options", () => {
    const icon = { $$typeof: Symbol.for("icon") };
    const recordRepresentation = (r: { title: string }) => r.title;
    const options = { group: "content" };
    const def = computeDefinition({
      name: "posts",
      icon,
      recordRepresentation,
      options,
    });
    expect(def.icon).toBe(icon);
    expect(def.recordRepresentation).toBe(recordRepresentation);
    expect(def.options).toBe(options);
  });
});
