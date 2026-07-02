import { describe, expect, it, vi } from "vitest";
import {
  createFormController,
  type FormController,
  normalizeFormError,
} from "./form-controller";

interface PostDraft {
  title: string;
  views: number;
}

const noopSave = async (): Promise<undefined> => undefined;

/** Controller over {title, views} with spies on the FormApi mount hooks. */
const makeController = () => {
  const onMountValidator = vi.fn(() => undefined);
  const onMountListener = vi.fn();
  const controller = createFormController<PostDraft>({
    defaultValues: { title: "a", views: 1 },
    save: noopSave,
    formOptions: {
      validators: { onMount: onMountValidator },
      listeners: { onMount: onMountListener },
    },
  });
  return { controller, onMountValidator, onMountListener };
};

/**
 * Wraps `form.mount` so tests can count mounts AND unmounts (the cleanup the
 * real mount returns is preserved — only observed).
 */
const spyMountLifecycle = (controller: FormController<PostDraft>) => {
  const form = controller.form;
  const realMount = form.mount;
  const unmountSpy = vi.fn();
  const mountSpy = vi.spyOn(form, "mount").mockImplementation(() => {
    const cleanup = realMount();
    return () => {
      unmountSpy();
      cleanup();
    };
  });
  return { mountSpy, unmountSpy };
};

describe("createFormController", () => {
  describe("inert construction", () => {
    it("runs NO mount side effects at construction (onMount validator + listener silent)", () => {
      const { onMountValidator, onMountListener } = makeController();
      expect(onMountValidator).not.toHaveBeenCalled();
      expect(onMountListener).not.toHaveBeenCalled();
    });

    it("exposes readable state before any subscriber (no mount required)", () => {
      const { controller } = makeController();
      expect(controller.getSnapshot().values).toEqual({
        title: "a",
        views: 1,
      });
    });

    it("registers no field instances at construction", () => {
      const { controller } = makeController();
      expect(controller.form.getFieldInfo("title").instance).toBeNull();
    });
  });

  describe("refcounted subscribe", () => {
    it("first subscriber mounts the form exactly once; later subscribers do not re-mount", () => {
      const { controller, onMountValidator, onMountListener } =
        makeController();
      const { mountSpy } = spyMountLifecycle(controller);
      controller.subscribe(() => {});
      expect(mountSpy).toHaveBeenCalledTimes(1);
      expect(onMountValidator).toHaveBeenCalledTimes(1);
      expect(onMountListener).toHaveBeenCalledTimes(1);
      controller.subscribe(() => {});
      expect(mountSpy).toHaveBeenCalledTimes(1);
      expect(onMountValidator).toHaveBeenCalledTimes(1);
    });

    it("unmounts on the LAST unsubscribe only", () => {
      const { controller } = makeController();
      const { unmountSpy } = spyMountLifecycle(controller);
      const unsubA = controller.subscribe(() => {});
      const unsubB = controller.subscribe(() => {});
      unsubA();
      expect(unmountSpy).not.toHaveBeenCalled();
      unsubB();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });

    it("re-attach after detach re-mounts (StrictMode sub/unsub/sub) and state survives", () => {
      const { controller } = makeController();
      const { mountSpy, unmountSpy } = spyMountLifecycle(controller);
      const unsub = controller.subscribe(() => {});
      controller.form.setFieldValue("title", "edited");
      unsub();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
      controller.subscribe(() => {});
      expect(mountSpy).toHaveBeenCalledTimes(2);
      expect(controller.getSnapshot().values.title).toBe("edited");
    });

    it("notifies each subscription individually (duplicate callbacks get one notification each)", () => {
      const { controller } = makeController();
      const twice = vi.fn();
      const once = vi.fn();
      const unsubTwiceA = controller.subscribe(twice);
      controller.subscribe(twice);
      controller.subscribe(once);
      twice.mockClear();
      once.mockClear();
      controller.form.setFieldValue("title", "b");
      // Whatever the store's notification batching, the doubly-registered
      // callback must observe exactly twice the control's notifications.
      expect(once.mock.calls.length).toBeGreaterThan(0);
      expect(twice.mock.calls.length).toBe(2 * once.mock.calls.length);
      unsubTwiceA();
      twice.mockClear();
      once.mockClear();
      controller.form.setFieldValue("title", "c");
      expect(twice.mock.calls.length).toBe(once.mock.calls.length);
    });

    it("unsubscribe is idempotent — a second call must not sever a sibling or unmount early", () => {
      const { controller } = makeController();
      const { unmountSpy } = spyMountLifecycle(controller);
      const listener = vi.fn();
      const unsubA = controller.subscribe(() => {});
      const unsubB = controller.subscribe(listener);
      unsubA();
      unsubA();
      expect(unmountSpy).not.toHaveBeenCalled();
      controller.form.setFieldValue("title", "b");
      expect(listener).toHaveBeenCalled();
      unsubB();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });

    it("the attaching subscriber observes mount-driven state changes (subscribe registered before mount)", () => {
      const listener = vi.fn();
      const controller = createFormController<PostDraft>({
        defaultValues: { title: "a", views: 1 },
        save: noopSave,
        formOptions: {
          // A failing onMount validator writes an error into form state
          // during mount — the subscriber that triggered the attach must see it.
          validators: { onMount: () => "chelone.validation.required" },
        },
      });
      controller.subscribe(listener);
      expect(listener).toHaveBeenCalled();
      expect(controller.getSnapshot().errorMap.onMount).toBe(
        "chelone.validation.required",
      );
    });
  });

  describe("getSnapshot", () => {
    it("returns form.store.state, reference-stable until a write", () => {
      const { controller } = makeController();
      const first = controller.getSnapshot();
      expect(controller.getSnapshot()).toBe(first);
      expect(first).toBe(controller.form.store.state);
      controller.form.setFieldValue("title", "b");
      const second = controller.getSnapshot();
      expect(second).not.toBe(first);
      expect(second.values.title).toBe("b");
      // No in-place mutation: the previous snapshot keeps its values.
      expect(first.values.title).toBe("a");
    });
  });

  describe("destroy", () => {
    it("is idempotent and unmounts exactly once while attached", () => {
      const { controller } = makeController();
      const { unmountSpy } = spyMountLifecycle(controller);
      controller.subscribe(() => {});
      controller.subscribe(() => {});
      controller.destroy();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
      controller.destroy();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });

    it("does not unmount when already detached", () => {
      const { controller } = makeController();
      const { unmountSpy } = spyMountLifecycle(controller);
      const unsub = controller.subscribe(() => {});
      unsub();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
      controller.destroy();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });

    it("severs every listener — no notifications after destroy", () => {
      const { controller } = makeController();
      const listener = vi.fn();
      controller.subscribe(listener);
      controller.destroy();
      listener.mockClear();
      controller.form.setFieldValue("title", "b");
      expect(listener).not.toHaveBeenCalled();
    });

    it("subscribe after destroy is a no-op: nothing mounts, returned unsubscribe is safe", () => {
      const { controller, onMountValidator } = makeController();
      const { mountSpy } = spyMountLifecycle(controller);
      controller.destroy();
      const listener = vi.fn();
      const unsub = controller.subscribe(listener);
      expect(mountSpy).not.toHaveBeenCalled();
      expect(onMountValidator).not.toHaveBeenCalled();
      controller.form.setFieldValue("title", "b");
      expect(listener).not.toHaveBeenCalled();
      expect(() => unsub()).not.toThrow();
    });

    it("an outstanding unsubscribe called after destroy is safe and cannot double-unmount", () => {
      const { controller } = makeController();
      const { unmountSpy } = spyMountLifecycle(controller);
      const unsub = controller.subscribe(() => {});
      controller.destroy();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
      expect(() => unsub()).not.toThrow();
      expect(unmountSpy).toHaveBeenCalledTimes(1);
    });
  });
});

describe("normalizeFormError", () => {
  it("passes strings through", () => {
    expect(normalizeFormError("Required")).toBe("Required");
  });

  it("preserves ra translatable payloads ({message, args})", () => {
    expect(
      normalizeFormError({
        message: "chelone.validation.minLength",
        args: { min: 5 },
      }),
    ).toEqual({ message: "chelone.validation.minLength", args: { min: 5 } });
  });

  it("collapses a bare {message} (StandardSchemaV1Issue shape) to its message", () => {
    expect(normalizeFormError({ message: "Too small", path: ["title"] })).toBe(
      "Too small",
    );
  });

  it("drops a non-object args and returns the message alone", () => {
    expect(normalizeFormError({ message: "x", args: 5 })).toBe("x");
  });

  it("uses an Error's message", () => {
    expect(normalizeFormError(new Error("boom"))).toBe("boom");
  });

  it("normalizes the first entry of an issue array", () => {
    expect(
      normalizeFormError([{ message: "first" }, { message: "second" }]),
    ).toBe("first");
  });

  it("returns undefined for nullish and empty-array input", () => {
    expect(normalizeFormError(null)).toBeUndefined();
    expect(normalizeFormError(undefined)).toBeUndefined();
    expect(normalizeFormError([])).toBeUndefined();
  });

  it("stringifies everything else", () => {
    expect(normalizeFormError(42)).toBe("42");
    expect(normalizeFormError({ code: 1 })).toBe("[object Object]");
    expect(normalizeFormError({ message: 123 })).toBe("[object Object]");
  });
});
