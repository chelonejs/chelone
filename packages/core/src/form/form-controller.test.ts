import { FieldApi } from "@tanstack/form-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createNotificationStore } from "../notification/notification-store";
import {
  createFormController,
  type FieldErrors,
  type FormController,
  type FormControllerOptions,
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

interface Draft {
  title: string;
  email: string;
}

const draftSchema = z.object({
  title: z.string().min(3, "too short"),
  email: z.string(),
});

/**
 * Attached controller over {title, email} with a notification store and a
 * save spy — the submit-pipeline harness. `mountField` registers a real
 * FieldApi instance so server-error distribution and revalidation are
 * observable exactly as a bound input would see them.
 */
const makeSubmitHarness = (
  overrides: Partial<FormControllerOptions<Draft>> = {},
) => {
  const notifications = createNotificationStore();
  const save = vi.fn(
    async (_data: Draft): Promise<FieldErrors | undefined> => undefined,
  );
  const controller = createFormController<Draft>({
    defaultValues: { title: "hello", email: "a@b.c" },
    notifications,
    save,
    ...overrides,
  });
  const detach = controller.subscribe(() => {});
  const mountField = (name: "title" | "email") => {
    const field = new FieldApi({ form: controller.form, name });
    field.mount();
    return field;
  };
  const lastNotification = () => notifications.getSnapshot().at(-1);
  return {
    controller,
    notifications,
    save,
    mountField,
    detach,
    lastNotification,
  };
};

describe("errors are written as messages", () => {
  it("a schema issue reaches the field's error map as its message", async () => {
    const { controller, mountField } = makeSubmitHarness({
      schema: draftSchema,
    });
    const title = mountField("title");
    title.handleChange("x");
    await controller.submit();
    expect(title.state.meta.errorMap.onDynamic).toBe("too short");
  });

  it("an escape-hatch onChange validator's Error reaches the error map as its message", () => {
    const { controller, mountField } = makeSubmitHarness({
      formOptions: { validators: { onChange: () => new Error("Bad") } },
    });
    mountField("title").handleChange("x");
    expect(controller.getSnapshot().errorMap.onChange).toBe("Bad");
  });

  it("an escape-hatch onChange validator's field issues reach each field as a message", () => {
    const { mountField } = makeSubmitHarness({
      formOptions: {
        validators: {
          onChange: () => ({
            form: undefined,
            fields: { title: [{ message: "chelone.validation.required" }] },
          }),
        },
      },
    });
    const title = mountField("title");
    title.handleChange("x");
    expect(title.state.meta.errorMap.onChange).toBe(
      "chelone.validation.required",
    );
  });

  it("an escape-hatch Standard Schema reaches the fields as messages", () => {
    const { mountField } = makeSubmitHarness({
      formOptions: { validators: { onChange: draftSchema } },
    });
    const title = mountField("title");
    title.handleChange("x");
    expect(title.state.meta.errorMap.onChange).toBe("too short");
  });

  it("a server field error list reaches the field as its first message", async () => {
    const { controller, save, mountField } = makeSubmitHarness();
    save.mockResolvedValueOnce({ email: ["already taken", "too long"] });
    const email = mountField("email");
    await controller.submit();
    expect(email.state.meta.errorMap.onSubmit).toBe("already taken");
  });
});

describe("submit pipeline", () => {
  describe("client-side validation (schema, D6 revalidateLogic wiring)", () => {
    it("does NOT validate on change before the first submit (mode: submit)", () => {
      const { controller, mountField } = makeSubmitHarness({
        schema: draftSchema,
      });
      const title = mountField("title");
      title.handleChange("x");
      expect(title.state.meta.errors).toEqual([]);
      expect(controller.getSnapshot().errors).toEqual([]);
    });

    it("invalid submit blocks save, lands the zod error on the field, notifies invalid_form", async () => {
      const { controller, save, mountField, lastNotification } =
        makeSubmitHarness({ schema: draftSchema });
      const title = mountField("title");
      title.handleChange("x");
      await controller.submit();
      expect(save).not.toHaveBeenCalled();
      expect(title.state.meta.errors.length).toBeGreaterThan(0);
      expect(lastNotification()).toMatchObject({
        message: "chelone.message.invalid_form",
        type: "error",
      });
    });

    it("re-validates on change AFTER a failed submit; the fixed form then saves", async () => {
      const { controller, save, mountField } = makeSubmitHarness({
        schema: draftSchema,
      });
      const title = mountField("title");
      title.handleChange("x");
      await controller.submit();
      expect(title.state.meta.errors.length).toBeGreaterThan(0);
      title.handleChange("long enough");
      expect(title.state.meta.errors).toEqual([]);
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ title: "long enough" }),
      );
    });

    it("blocks save with NO mounted fields (vanilla submit-only usage)", async () => {
      const { controller, save, lastNotification } = makeSubmitHarness({
        defaultValues: { title: "x", email: "a@b.c" },
        schema: draftSchema,
      });
      await controller.submit();
      expect(save).not.toHaveBeenCalled();
      expect(lastNotification()).toMatchObject({
        message: "chelone.message.invalid_form",
        type: "error",
      });
      expect(controller.getSnapshot().isValid).toBe(false);
    });

    it("chains a user onSubmitInvalid from formOptions after the default notify", async () => {
      const userInvalid = vi.fn();
      const { controller, notifications } = makeSubmitHarness({
        defaultValues: { title: "x", email: "a@b.c" },
        schema: draftSchema,
        formOptions: { onSubmitInvalid: userInvalid },
      });
      await controller.submit();
      expect(userInvalid).toHaveBeenCalledTimes(1);
      expect(
        notifications
          .getSnapshot()
          .some((n) => n.message === "chelone.message.invalid_form"),
      ).toBe(true);
    });
  });

  describe("form-level validate fn (ra contract)", () => {
    it("sync fn blocks save; field + root errors surface; re-validates on change after submit", async () => {
      const { controller, save, mountField, lastNotification } =
        makeSubmitHarness({
          validate: (values) =>
            values.title === "bad"
              ? { root: "chelone.validation.no_bad", title: "bad title" }
              : undefined,
        });
      const title = mountField("title");
      title.handleChange("bad");
      await controller.submit();
      expect(save).not.toHaveBeenCalled();
      expect(title.state.meta.errors).toContain("bad title");
      expect(lastNotification()).toMatchObject({
        message: "chelone.validation.no_bad",
        type: "error",
      });
      title.handleChange("good");
      expect(title.state.meta.errors).toEqual([]);
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(1);
    });

    it("async fn blocks save via the onSubmit channel and auto-clears on edit", async () => {
      const { controller, save, mountField, lastNotification } =
        makeSubmitHarness({
          validate: async (values) =>
            values.email.includes("bad") ? { email: "async bad" } : undefined,
        });
      const email = mountField("email");
      email.handleChange("bad@x.dev");
      await controller.submit();
      expect(save).not.toHaveBeenCalled();
      expect(email.state.meta.errors).toContain("async bad");
      expect(lastNotification()).toMatchObject({
        message: "chelone.message.invalid_form",
        type: "error",
      });
      email.handleChange("fine@x.dev");
      expect(email.state.meta.errors).toEqual([]);
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(1);
    });

    it("a MIXED sync/async fn: a sync error return AFTER the async latch still blocks save", async () => {
      // ra's validator contract legally mixes a sync fast-path error with an
      // async server check: `if (!v.email) return {email: 'required'};
      // return checkServer(v)`. Once the first thenable latches the fn out of
      // the sync onDynamic slot, later SYNC error returns only surface through
      // the submit pipeline — they must block the save exactly like awaited
      // async results.
      const { controller, save, mountField, lastNotification } =
        makeSubmitHarness({
          validate: (values) => {
            if (!values.email) {
              return { email: "chelone.validation.required" };
            }
            return Promise.resolve(undefined); // async server check passes
          },
        });
      const email = mountField("email");
      // 1st submit: email present -> thenable return latches the fn as async.
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(1);
      // Clear the email: the latched fn now returns a SYNC error.
      email.handleChange("");
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(1); // save must NOT run again
      expect(email.state.meta.errors).toContain("chelone.validation.required");
      expect(lastNotification()).toMatchObject({
        message: "chelone.message.invalid_form",
        type: "error",
      });
      // Same auto-clear channel as async/server errors (onSubmit key).
      email.handleChange("fixed@b.c");
      expect(email.state.meta.errors).toEqual([]);
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(2);
    });
  });

  describe("server field errors (D4: onSubmit channel, never onServer)", () => {
    it("distributes fieldErrors onto mounted fields; root becomes the form-level error + notify", async () => {
      const { controller, save, mountField, lastNotification } =
        makeSubmitHarness();
      save.mockResolvedValueOnce({
        root: "server says no",
        email: "already taken",
      });
      const email = mountField("email");
      await controller.submit();
      expect(email.state.meta.errors).toContain("already taken");
      expect(email.state.meta.errorMap.onSubmit).toBe("already taken");
      expect(controller.getSnapshot().errorMap.onSubmit).toBe("server says no");
      expect(lastNotification()).toMatchObject({
        message: "server says no",
        type: "error",
      });
    });

    it("addresses array paths (items[0].sku)", async () => {
      interface OrderDraft {
        items: Array<{ sku: string }>;
      }
      const notifications = createNotificationStore();
      const controller = createFormController<OrderDraft>({
        defaultValues: { items: [{ sku: "a" }] },
        notifications,
        save: async () => ({ "items[0].sku": "bad sku" }),
      });
      controller.subscribe(() => {});
      const sku = new FieldApi({ form: controller.form, name: "items[0].sku" });
      sku.mount();
      await controller.submit();
      expect(sku.state.meta.errors).toContain("bad sku");
      controller.destroy();
    });

    it("PINNING: onSubmit-key server errors auto-clear on the next passing field change", async () => {
      const { controller, save, mountField } = makeSubmitHarness();
      save.mockResolvedValueOnce({ root: "srv", email: "taken" });
      const email = mountField("email");
      await controller.submit();
      expect(email.state.meta.errors).toContain("taken");
      email.handleChange("new@b.c");
      expect(email.state.meta.errors).toEqual([]);
      expect(controller.getSnapshot().errorMap.onSubmit).toBeUndefined();
    });

    it("resubmit WITHOUT edits re-runs save (stale server errors cannot dead-end the canSubmit gate)", async () => {
      const { controller, save, mountField } = makeSubmitHarness();
      save.mockResolvedValueOnce({ email: "taken" });
      mountField("email");
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(1);
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(2);
      expect(controller.getSnapshot().isSubmitted).toBe(true);
    });

    it("a string[] root notifies its first entry; a root-less error map notifies invalid_form", async () => {
      const first = makeSubmitHarness();
      first.save.mockResolvedValueOnce({ root: ["first", "second"] });
      await first.controller.submit();
      expect(first.lastNotification()).toMatchObject({
        message: "first",
        type: "error",
      });

      const second = makeSubmitHarness();
      second.save.mockResolvedValueOnce({ email: "taken" });
      await second.controller.submit();
      expect(second.lastNotification()).toMatchObject({
        message: "chelone.message.invalid_form",
        type: "error",
      });
    });
  });

  describe("success path (D5 reconciliation)", () => {
    it("resets to the submitted values — rebaselined defaults, isDefaultValue true", async () => {
      const { controller, save, mountField } = makeSubmitHarness();
      const title = mountField("title");
      title.handleChange("edited");
      expect(controller.getSnapshot().isDefaultValue).toBe(false);
      await controller.submit();
      expect(save).toHaveBeenCalledTimes(1);
      const snapshot = controller.getSnapshot();
      expect(snapshot.values.title).toBe("edited");
      expect(snapshot.isDefaultValue).toBe(true);
      expect(snapshot.isDirty).toBe(false);
    });

    it("resetOnSuccess: false keeps the original baseline (still not default)", async () => {
      const { controller, mountField } = makeSubmitHarness({
        resetOnSuccess: false,
      });
      const title = mountField("title");
      title.handleChange("edited");
      await controller.submit();
      expect(controller.getSnapshot().values.title).toBe("edited");
      expect(controller.getSnapshot().isDefaultValue).toBe(false);
    });

    it("onSuccess runs AFTER the reset with the saved data", async () => {
      let defaultAtCall: boolean | undefined;
      const onSuccess = vi.fn((_data: Draft) => {
        defaultAtCall = controller.getSnapshot().isDefaultValue;
      });
      const { controller, mountField } = makeSubmitHarness({ onSuccess });
      const title = mountField("title");
      title.handleChange("edited");
      await controller.submit();
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "edited" }),
      );
      expect(defaultAtCall).toBe(true);
    });
  });

  describe("sanitizeEmptyValues wiring", () => {
    it("without a record baseline, empty keys are omitted from the payload (form keeps them)", async () => {
      const { controller, save, mountField } = makeSubmitHarness({
        sanitizeEmptyValues: true,
      });
      const email = mountField("email");
      email.handleChange("");
      await controller.submit();
      expect(save.mock.calls[0]?.[0]).toEqual({ title: "hello" });
      expect(controller.getSnapshot().values.email).toBe("");
    });

    it("with a getRecord baseline, on-record empty keys become null", async () => {
      const { controller, save, mountField } = makeSubmitHarness({
        sanitizeEmptyValues: true,
        getRecord: () => ({ email: "old@b.c" }),
      });
      const email = mountField("email");
      email.handleChange("");
      await controller.submit();
      expect(save.mock.calls[0]?.[0]).toEqual({ title: "hello", email: null });
    });
  });

  describe("robustness", () => {
    it("never rejects: a crashing save notifies http_error", async () => {
      const { controller, save, lastNotification } = makeSubmitHarness();
      save.mockRejectedValueOnce(new Error("boom"));
      await expect(controller.submit()).resolves.toBeUndefined();
      expect(lastNotification()).toMatchObject({
        message: "chelone.notification.http_error",
        type: "error",
      });
      expect(lastNotification()?.messageArgs?._).toContain("boom");
    });

    it("submit after destroy is a no-op", async () => {
      const { controller, save } = makeSubmitHarness();
      controller.destroy();
      await expect(controller.submit()).resolves.toBeUndefined();
      expect(save).not.toHaveBeenCalled();
    });
  });
});
