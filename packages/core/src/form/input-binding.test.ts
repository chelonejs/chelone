import { runInNewContext } from "node:vm";
import type { StandardSchemaV1 } from "@tanstack/form-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createNotificationStore } from "../notification/notification-store";
import { createFormController } from "./form-controller";
import {
  createFieldBinding,
  defaultFormat,
  defaultParse,
  type FieldBinding,
} from "./input-binding";
import { minLength, required } from "./validators";

interface Draft {
  title: string;
  views: number;
}

/** Record-hydration write: value only, meta untouched, no validation. */
const hydrationOpts = {
  dontUpdateMeta: true,
  dontValidate: true,
  dontRunListeners: true,
} as const;

/**
 * Wraps `field.mount` so tests can count mounts AND unmounts (the cleanup the
 * real mount returns is preserved — only observed).
 */
const spyFieldMount = <TRecord>(
  binding: Pick<FieldBinding<TRecord>, "field">,
) => {
  const realMount = binding.field.mount;
  const unmountSpy = vi.fn();
  const mountSpy = vi.spyOn(binding.field, "mount").mockImplementation(() => {
    const cleanup = realMount();
    return () => {
      unmountSpy();
      cleanup();
    };
  });
  return { mountSpy, unmountSpy };
};

describe("defaultFormat / defaultParse", () => {
  it("format renders null/undefined as '' and passes everything else through", () => {
    expect(defaultFormat(null)).toBe("");
    expect(defaultFormat(undefined)).toBe("");
    expect(defaultFormat(0)).toBe(0);
    expect(defaultFormat(false)).toBe(false);
    expect(defaultFormat("x")).toBe("x");
  });

  it("parse stores '' as null and preserves 0/false", () => {
    expect(defaultParse("")).toBeNull();
    expect(defaultParse("x")).toBe("x");
    expect(defaultParse(0)).toBe(0);
    expect(defaultParse(false)).toBe(false);
  });
});

describe("createFieldBinding — lifecycle", () => {
  interface Sparse {
    title?: string | null;
  }

  const makeController = (defaultValues: Sparse = {}) =>
    createFormController<Sparse>({
      defaultValues,
      save: async () => undefined,
    });

  it("construction is INERT: no field instance registered, no default seeded", () => {
    const controller = makeController();
    controller.subscribe(() => {});
    const before = controller.getSnapshot();
    createFieldBinding(controller.form, {
      source: "title",
      defaultValue: "seed",
    });
    expect(controller.form.getFieldInfo("title").instance).toBeNull();
    expect(controller.form.getFieldValue("title")).toBeUndefined();
    expect(controller.getSnapshot()).toBe(before);
  });

  describe("defaultValue seeding (ra precedence: record > input default)", () => {
    it("seeds the input default into a hole (untouched + undefined) without dirtying", () => {
      const controller = makeController({});
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        defaultValue: "seed",
      });
      binding.subscribe(() => {});
      expect(controller.form.getFieldValue("title")).toBe("seed");
      const meta = controller.form.getFieldMeta("title");
      expect(meta?.isTouched).toBe(false);
      expect(meta?.isDirty).toBe(false);
      expect(controller.getSnapshot().isDirty).toBe(false);
    });

    it("never overwrites an existing record value (form-core's raw mount would)", () => {
      const controller = makeController({ title: "record" });
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        defaultValue: "seed",
      });
      binding.subscribe(() => {});
      expect(controller.form.getFieldValue("title")).toBe("record");
    });

    it("a null record value blocks the input default (null is a value)", () => {
      const controller = makeController({ title: null });
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        defaultValue: "seed",
      });
      binding.subscribe(() => {});
      expect(controller.form.getFieldValue("title")).toBeNull();
    });

    it("a record hydrated BETWEEN construction and attach still wins (guard re-evaluated at attach)", () => {
      const controller = makeController({});
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        defaultValue: "seed",
      });
      controller.form.setFieldValue("title", "record", hydrationOpts);
      binding.subscribe(() => {});
      expect(controller.form.getFieldValue("title")).toBe("record");
      expect(controller.form.getFieldMeta("title")?.isTouched).toBe(false);
    });

    it("re-seeds when a reset reopens the hole (ra useApplyInputDefaultValues parity)", () => {
      const controller = makeController({});
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        defaultValue: "seed",
      });
      binding.subscribe(() => {});
      expect(controller.form.getFieldValue("title")).toBe("seed");
      // A reset WITH values (the edit-form id-change hard reset) skips
      // form-core's own instance-default re-application — the reopened hole
      // must be re-seeded by the binding's guard on the next update.
      controller.form.reset({});
      expect(controller.form.getFieldValue("title")).toBeUndefined();
      binding.update({ defaultValue: "seed" });
      expect(controller.form.getFieldValue("title")).toBe("seed");
    });
  });

  describe("refcounted subscribe", () => {
    it("first subscriber mounts the field exactly once and registers the instance", () => {
      const controller = makeController();
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      const { mountSpy } = spyFieldMount(binding);
      binding.subscribe(() => {});
      expect(mountSpy).toHaveBeenCalledTimes(1);
      expect(controller.form.getFieldInfo("title").instance).toBe(
        binding.field,
      );
      binding.subscribe(() => {});
      expect(mountSpy).toHaveBeenCalledTimes(1);
    });

    it("the attaching subscriber observes mount-driven writes (seed notifies)", () => {
      const controller = makeController({});
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        defaultValue: "seed",
      });
      const listener = vi.fn();
      binding.subscribe(listener);
      expect(listener).toHaveBeenCalled();
    });

    it("unmounts on the LAST unsubscribe only; instance deregisters", () => {
      const controller = makeController();
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      const { unmountSpy } = spyFieldMount(binding);
      const unsubA = binding.subscribe(() => {});
      const unsubB = binding.subscribe(() => {});
      unsubA();
      expect(unmountSpy).not.toHaveBeenCalled();
      unsubB();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
      expect(controller.form.getFieldInfo("title").instance).toBeNull();
    });

    it("unsubscribe is idempotent — a double call cannot unmount early", () => {
      const controller = makeController();
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      const { unmountSpy } = spyFieldMount(binding);
      const unsubA = binding.subscribe(() => {});
      binding.subscribe(() => {});
      unsubA();
      unsubA();
      expect(unmountSpy).not.toHaveBeenCalled();
    });

    it("re-attach after detach re-mounts and the value survives (StrictMode / Activity)", () => {
      const controller = makeController();
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        defaultValue: "seed",
      });
      const { mountSpy } = spyFieldMount(binding);
      const unsub = binding.subscribe(() => {});
      binding.setValue("typed");
      unsub();
      binding.subscribe(() => {});
      expect(mountSpy).toHaveBeenCalledTimes(2);
      // remount must NOT reseed the default over the user's value
      expect(controller.form.getFieldValue("title")).toBe("typed");
    });

    it("PINNING: unmount preserves isTouched/isDirty but clears field errors", async () => {
      const notifications = createNotificationStore();
      const controller = createFormController<Sparse>({
        defaultValues: { title: "x" },
        notifications,
        save: async () => undefined,
      });
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        validate: [required()],
      });
      const unsub = binding.subscribe(() => {});
      binding.setValue("");
      await controller.submit();
      expect(binding.getSnapshot().meta.errors).toContain(
        "chelone.validation.required",
      );
      unsub();
      const meta = controller.form.getFieldMeta("title");
      expect(meta?.isTouched).toBe(true);
      expect(meta?.isDirty).toBe(true);
      expect(meta?.errorMap).toEqual({});
    });
  });

  describe("destroy", () => {
    it("is idempotent and unmounts exactly once while attached", () => {
      const controller = makeController();
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      const { unmountSpy } = spyFieldMount(binding);
      binding.subscribe(() => {});
      binding.subscribe(() => {});
      binding.destroy();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
      binding.destroy();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });

    it("subscribe after destroy is a no-op: nothing mounts, unsubscribe is safe", () => {
      const controller = makeController();
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      const { mountSpy } = spyFieldMount(binding);
      binding.destroy();
      const listener = vi.fn();
      const unsub = binding.subscribe(listener);
      expect(mountSpy).not.toHaveBeenCalled();
      controller.form.setFieldValue("title", "b", hydrationOpts);
      expect(listener).not.toHaveBeenCalled();
      expect(() => unsub()).not.toThrow();
    });

    it("an outstanding unsubscribe called after destroy cannot double-unmount", () => {
      const controller = makeController();
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      const { unmountSpy } = spyFieldMount(binding);
      const unsub = binding.subscribe(() => {});
      binding.destroy();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
      expect(() => unsub()).not.toThrow();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("value helpers", () => {
    it("getValue applies the default format ('' for null/undefined, identity otherwise)", () => {
      const controller = createFormController<{
        title?: string | null;
        views?: number;
      }>({
        defaultValues: { title: null, views: 0 },
        save: async () => undefined,
      });
      controller.subscribe(() => {});
      const title = createFieldBinding(controller.form, { source: "title" });
      const views = createFieldBinding(controller.form, { source: "views" });
      title.subscribe(() => {});
      views.subscribe(() => {});
      expect(title.getValue()).toBe("");
      expect(views.getValue()).toBe(0);
    });

    it("setValue applies the default parse ('' -> null) and marks touched+dirty", () => {
      const controller = makeController({ title: "x" });
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      binding.subscribe(() => {});
      binding.setValue("");
      expect(controller.form.getFieldValue("title")).toBeNull();
      expect(binding.getSnapshot().meta.isTouched).toBe(true);
      expect(binding.getSnapshot().meta.isDirty).toBe(true);
      binding.setValue("y");
      expect(controller.form.getFieldValue("title")).toBe("y");
    });

    it("custom format/parse are applied and update() swaps them (render freshness)", () => {
      const controller = makeController({ title: "a" });
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, {
        source: "title",
        format: (value) => `[${String(value)}]`,
        parse: (input) => String(input).toUpperCase(),
      });
      binding.subscribe(() => {});
      expect(binding.getValue()).toBe("[a]");
      binding.setValue("b");
      expect(controller.form.getFieldValue("title")).toBe("B");
      binding.update({ format: (value) => `(${String(value)})` });
      expect(binding.getValue()).toBe("(B)");
      // parse fell back to the default after the wholesale update
      binding.setValue("");
      expect(controller.form.getFieldValue("title")).toBeNull();
    });

    it("blur marks the field blurred", () => {
      const controller = makeController({ title: "a" });
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      binding.subscribe(() => {});
      expect(binding.getSnapshot().meta.isBlurred).toBe(false);
      binding.blur();
      expect(binding.getSnapshot().meta.isBlurred).toBe(true);
    });

    it("blur before the binding attaches leaves the field meta whole", () => {
      // An autofocused input loses focus in the commit that created it, before
      // the attach effect runs. The write used to leave a meta with no
      // `errorMap`, which the adapters' error selector throws on.
      const controller = makeController({ title: "a" });
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      binding.blur();
      binding.subscribe(() => {});
      const { meta } = binding.getSnapshot();
      expect(meta.errorMap).toEqual({});
      expect(meta.isBlurred).toBe(false);
    });

    it("getSnapshot returns field.store.state, reference-stable until a write", () => {
      const controller = makeController({ title: "a" });
      controller.subscribe(() => {});
      const binding = createFieldBinding(controller.form, { source: "title" });
      binding.subscribe(() => {});
      const first = binding.getSnapshot();
      expect(binding.getSnapshot()).toBe(first);
      binding.setValue("b");
      expect(binding.getSnapshot()).not.toBe(first);
      expect(binding.getSnapshot().value).toBe("b");
    });
  });
});

/**
 * Attached controller + field binding — the validator-wiring harness. The
 * controller has NO form-level schema/validate: field-level validators must
 * work on their own (pins the always-on revalidateLogic default).
 */
const makeWiringHarness = (
  bindingOptions: Omit<
    Parameters<typeof createFieldBinding<Draft, "title">>[1],
    "source"
  > = {},
) => {
  const notifications = createNotificationStore();
  const save = vi.fn(async (_data: Draft): Promise<undefined> => undefined);
  const controller = createFormController<Draft>({
    defaultValues: { title: "", views: 1 },
    notifications,
    save,
  });
  const detachForm = controller.subscribe(() => {});
  const binding = createFieldBinding(controller.form, {
    source: "title",
    ...bindingOptions,
  });
  const detachField = binding.subscribe(() => {});
  const errors = () => binding.getSnapshot().meta.errors;
  return {
    controller,
    binding,
    save,
    notifications,
    detachForm,
    detachField,
    errors,
  };
};

describe("createFieldBinding — validator wiring (ra submit-then-change semantics)", () => {
  it("does NOT validate on change before the first submit", () => {
    const { binding, errors } = makeWiringHarness({ validate: [required()] });
    binding.setValue("x");
    binding.setValue("");
    expect(errors()).toEqual([]);
  });

  it("a failing submit blocks save, lands the error, then re-validates on change", async () => {
    const { binding, controller, save, notifications, errors } =
      makeWiringHarness({ validate: [required()] });
    await controller.submit();
    expect(save).not.toHaveBeenCalled();
    expect(errors()).toContain("chelone.validation.required");
    expect(notifications.getSnapshot().at(-1)).toMatchObject({
      message: "chelone.message.invalid_form",
      type: "error",
    });
    binding.setValue("fixed");
    expect(errors()).toEqual([]);
    await controller.submit();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ title: "fixed" }),
    );
  });

  it("passes (value, allValues, meta-with-source) to validators", async () => {
    const spy = vi.fn(() => undefined);
    const { binding, controller } = makeWiringHarness({ validate: [spy] });
    binding.setValue("hello");
    await controller.submit();
    expect(spy).toHaveBeenCalledWith(
      "hello",
      expect.objectContaining({ title: "hello", views: 1 }),
      expect.objectContaining({ source: "title" }),
    );
  });

  it("merges validatorMeta into the meta argument", async () => {
    const spy = vi.fn(() => undefined);
    const { controller } = makeWiringHarness({
      validate: [spy],
      validatorMeta: { label: "Title" },
    });
    await controller.submit();
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ source: "title", label: "Title" }),
    );
  });

  it("translatable payloads flow natively (no string smuggling)", async () => {
    const { binding, controller, errors } = makeWiringHarness({
      validate: [minLength(5)],
    });
    binding.setValue("ab");
    await controller.submit();
    expect(errors()).toContainEqual({
      message: "chelone.validation.minLength",
      args: { min: 5 },
    });
  });

  it("an async validator blocks save, runs ONCE per validation event, clears on fix", async () => {
    const spy = vi.fn(async (value: unknown) =>
      value === "" ? "async required" : undefined,
    );
    const { binding, controller, save, errors } = makeWiringHarness({
      validate: [spy],
    });
    await controller.submit();
    expect(save).not.toHaveBeenCalled();
    expect(errors()).toContain("async required");
    expect(spy).toHaveBeenCalledTimes(1);
    binding.setValue("ok");
    // The latched sync slot clears the stale error immediately; the async
    // re-check runs behind form-core's debounce timer (setTimeout 0), which a
    // loaded CI box can hold past any fixed sleep.
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(errors()).toEqual([]);
    await controller.submit();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("sync validators cause NO isValidating flicker (per-keystroke render budget)", async () => {
    const { binding, controller } = makeWiringHarness({
      validate: [minLength(3)],
    });
    let flips = 0;
    let previous = binding.getSnapshot().meta.isValidating;
    binding.subscribe(() => {
      const current = binding.getSnapshot().meta.isValidating;
      if (current !== previous) {
        flips++;
        previous = current;
      }
    });
    binding.setValue("x");
    await controller.submit(); // fails minLength
    binding.setValue("xy"); // revalidates, still failing
    binding.setValue("xyz"); // passes
    await controller.submit(); // saves
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(flips).toBe(0);
  });

  it("isRequired() reflects the RAW validate prop and follows update()", () => {
    const { binding } = makeWiringHarness({
      validate: [minLength(2), required()],
    });
    expect(binding.isRequired()).toBe(true);
    binding.update({ validate: [minLength(2)] });
    expect(binding.isRequired()).toBe(false);
  });
});

describe("createFieldBinding — field-level schema", () => {
  it("validates with the schema; fn validators are skipped while the schema fails (first error wins)", async () => {
    const spy = vi.fn(() => undefined);
    const { binding, controller, save, errors } = makeWiringHarness({
      schema: z.string().min(3, "too short"),
      validate: [spy],
    });
    binding.setValue("x");
    await controller.submit();
    expect(save).not.toHaveBeenCalled();
    expect(errors()).toEqual(["too short"]);
    expect(spy).not.toHaveBeenCalled();
    binding.setValue("long enough");
    expect(errors()).toEqual([]);
    await controller.submit();
    expect(spy).toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("routes a schema whose validate returns a thenable that is not this realm's Promise", async () => {
    // A `Promise` from another realm fails `instanceof Promise`, and so does a
    // validator that hands back its own thenable. Both must still reach the
    // async latch: read as a sync outcome, their issues are dropped and the
    // value submits with no error shown.
    // type-escape: runInNewContext hands back the vm realm's globals as unknown.
    const ForeignPromise = runInNewContext("Promise") as typeof Promise;
    expect(new ForeignPromise((resolve) => resolve(1))).not.toBeInstanceOf(
      Promise,
    );

    const schema: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "chelone-test",
        validate: () =>
          new ForeignPromise((resolve) =>
            resolve({ issues: [{ message: "thenable schema rejects" }] }),
          ),
      },
    };

    const { binding, controller, save, errors } = makeWiringHarness({ schema });
    binding.setValue("x");
    await controller.submit();
    expect(save).not.toHaveBeenCalled();
    expect(errors()).toEqual(["thenable schema rejects"]);
  });
});

describe("createFieldBinding — scalar-array fields (#20 pin)", () => {
  interface Tagged {
    tags: string[];
  }

  it("binds tags[1], receives form-schema zod errors addressed to it, edits the element", async () => {
    const save = vi.fn(async (_data: Tagged): Promise<undefined> => undefined);
    const controller = createFormController<Tagged>({
      defaultValues: { tags: ["long-enough", "x"] },
      schema: z.object({ tags: z.array(z.string().min(3, "too short")) }),
      save,
    });
    controller.subscribe(() => {});
    const binding = createFieldBinding(controller.form, { source: "tags[1]" });
    binding.subscribe(() => {});
    expect(binding.getValue()).toBe("x");
    await controller.submit();
    expect(save).not.toHaveBeenCalled();
    expect(binding.getSnapshot().meta.errors).toEqual(["too short"]);
    binding.setValue("fixed-tag");
    expect(controller.getSnapshot().values.tags).toEqual([
      "long-enough",
      "fixed-tag",
    ]);
    expect(binding.getSnapshot().meta.errors).toEqual([]);
    await controller.submit();
    expect(save).toHaveBeenCalledTimes(1);
    controller.destroy();
  });
});
