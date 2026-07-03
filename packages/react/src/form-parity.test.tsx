import {
  createNotificationStore,
  createStore,
  defineResources,
  type FieldErrors,
  fakeDataProvider,
  required,
  ValidationError,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ArrayInputProvider,
  IteratorRowProvider,
  useArrayInput,
} from "./array-hooks";
import { CheloneProvider } from "./context";
import { CheloneFormProvider } from "./form-context";
import {
  type UseInputResult,
  useCreateForm,
  useEditForm,
  useForm,
  useInput,
} from "./form-hooks";

// Unmount every mounted tree, drain the form controllers' pending
// validation/hydration microtasks so they never interleave into the next test
// (the leak `array-hooks.test.tsx` documents), and restore the dataProvider
// spies the edit/create tests install.
afterEach(async () => {
  cleanup();
  await act(async () => {});
  vi.restoreAllMocks();
});

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string(), views: z.number() }),
  },
});
const seedRows = [{ id: 1, title: "t1", views: 5 }];

function makeWrapper() {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(seedRows),
  });
  const store = createStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      notifications={notifications}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper, dataProvider, notifications };
}

/**
 * Mounts a set of `useInput` consumers under a standalone `useForm` with the
 * given defaults + save spy, returning the form handle, the per-source input
 * handles, and the save spy for payload assertions.
 */
function setupForm<TFormData extends Record<string, unknown>>(
  formOptions: {
    defaultValues?: TFormData;
    save?: (data: TFormData) => Promise<FieldErrors | undefined>;
    sanitizeEmptyValues?: boolean;
  },
  inputs: Array<Parameters<typeof useInput>[0]>,
) {
  const { wrapper } = makeWrapper();
  const save =
    formOptions.save ?? vi.fn(async () => undefined as FieldErrors | undefined);
  const latestForm: { current: ReturnType<typeof useForm<TFormData>> | null } =
    { current: null };
  const latest: Record<string, UseInputResult | null> = {};
  for (const i of inputs) latest[i.source] = null;

  function InputConsumer({ opts }: { opts: Parameters<typeof useInput>[0] }) {
    latest[opts.source] = useInput(opts);
    return null;
  }
  function Host() {
    const form = useForm<TFormData>({ ...formOptions, save });
    latestForm.current = form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {inputs.map((opts) => (
          <InputConsumer key={opts.source} opts={opts} />
        ))}
      </CheloneFormProvider>
    );
  }
  render(<Host />, { wrapper });
  return { latestForm, latest, save };
}

describe("parity: defaultValue precedence matrix", () => {
  // record value > input defaultValue > form defaultValues; a null record value
  // BLOCKS the input default; 0/''/false record values are never overwritten.
  it("record value wins over input defaultValue", async () => {
    const { latest } = setupForm<{ title: string }>(
      { defaultValues: { title: "from-record" } },
      [{ source: "title", defaultValue: "from-input" }],
    );
    await act(async () => {});
    expect(latest.title?.field.value).toBe("from-record");
  });

  it("input defaultValue fills a hole (no form default for the key)", async () => {
    const { latest, latestForm } = setupForm<Record<string, string>>({}, [
      { source: "title", defaultValue: "from-input" },
    ]);
    await act(async () => {});
    expect(latest.title?.field.value).toBe("from-input");
    expect(latestForm.current?.form.state.values.title).toBe("from-input");
  });

  it("a null record value BLOCKS the input default (renders '', stores null)", async () => {
    const { latest, latestForm } = setupForm<{ title: string | null }>(
      { defaultValues: { title: null } },
      [{ source: "title", defaultValue: "from-input" }],
    );
    await act(async () => {});
    // null is not a hole (form.getFieldValue !== undefined), so the input
    // default is suppressed; the ra default format shows '' for null.
    expect(latest.title?.field.value).toBe("");
    expect(latestForm.current?.form.state.values.title).toBeNull();
  });

  it("record value 0 is never overwritten by an input default", async () => {
    const { latest, latestForm } = setupForm<{ views: number }>(
      { defaultValues: { views: 0 } },
      [{ source: "views", defaultValue: 99 }],
    );
    await act(async () => {});
    expect(latestForm.current?.form.state.values.views).toBe(0);
    expect(latest.views?.field.value).toBe(0);
  });

  it("record value '' is never overwritten by an input default", async () => {
    const { latest, latestForm } = setupForm<{ title: string }>(
      { defaultValues: { title: "" } },
      [{ source: "title", defaultValue: "from-input" }],
    );
    await act(async () => {});
    expect(latestForm.current?.form.state.values.title).toBe("");
    expect(latest.title?.field.value).toBe("");
  });

  it("record value false is never overwritten by an input default", async () => {
    const { latestForm } = setupForm<{ done: boolean }>(
      { defaultValues: { done: false } },
      [{ source: "done", defaultValue: true }],
    );
    await act(async () => {});
    expect(latestForm.current?.form.state.values.done).toBe(false);
  });
});

describe("parity: '' -> null on clear flows to the submit payload", () => {
  it("clearing a text input stores null and the save payload carries null", async () => {
    const save = vi.fn(async () => undefined as FieldErrors | undefined);
    const { latest, latestForm } = setupForm<{ title: string | null }>(
      { defaultValues: { title: "hello" }, save },
      [{ source: "title" }],
    );
    await act(async () => {});
    act(() => latest.title?.field.onChange(""));
    expect(latestForm.current?.form.state.values.title).toBeNull();

    await act(async () => {
      await latestForm.current?.submit();
    });
    expect(save).toHaveBeenCalledExactlyOnceWith({ title: null });
  });

  it("sanitizeEmptyValues omits an empty key absent from the record baseline", async () => {
    // Standalone form has no record baseline -> empty top-level keys are
    // OMITTED (ra semantics), while 0/false are kept.
    const save = vi.fn(async () => undefined as FieldErrors | undefined);
    const { latest, latestForm } = setupForm<{
      title: string | null;
      views: number;
    }>(
      {
        defaultValues: { title: "x", views: 0 },
        save,
        sanitizeEmptyValues: true,
      },
      [{ source: "title" }, { source: "views" }],
    );
    await act(async () => {});
    act(() => latest.title?.field.onChange(""));
    await act(async () => {
      await latestForm.current?.submit();
    });
    // title cleared -> null -> no record baseline -> omitted; views:0 kept.
    expect(save).toHaveBeenCalledExactlyOnceWith({ views: 0 });
  });
});

describe("parity: hydration must not dirty the form", () => {
  it("async record arrives -> values appear, isDirty/isDefaultValue untouched", async () => {
    const { wrapper } = makeWrapper();
    const latest: {
      edit: ReturnType<typeof useEditForm<typeof resources, "posts">> | null;
      title: UseInputResult | null;
    } = { edit: null, title: null };
    function TitleInput() {
      latest.title = useInput({ source: "title" });
      return null;
    }
    function EditHost() {
      const editForm = useEditForm<typeof resources, "posts">("posts", {
        id: 1,
      });
      latest.edit = editForm;
      return (
        <CheloneFormProvider form={editForm.form} submit={editForm.submit}>
          <TitleInput />
        </CheloneFormProvider>
      );
    }
    render(<EditHost />, { wrapper });

    await waitFor(() => expect(latest.title?.field.value).toBe("t1"));
    // The record hydrated the form WITHOUT marking it dirty or non-default.
    expect(latest.edit?.isDirty).toBe(false);
    expect(latest.edit?.isDefaultValue).toBe(true);
    expect(latest.title?.fieldState.isDirty).toBe(false);
    expect(latest.title?.fieldState.isTouched).toBe(false);
  });
});

describe("parity: server-error clear-on-edit", () => {
  it("a server field error clears on the next edit (onSubmit channel, D4)", async () => {
    const save = vi
      .fn<(d: { title: string }) => Promise<FieldErrors | undefined>>()
      .mockResolvedValueOnce({ title: "app.errors.taken" })
      .mockResolvedValue(undefined);
    const { latest, latestForm } = setupForm<{ title: string }>(
      { defaultValues: { title: "dup" }, save },
      [{ source: "title" }],
    );
    await act(async () => {});
    await act(async () => {
      await latestForm.current?.submit();
    });
    expect(latest.title?.fieldState.error).toBe("app.errors.taken");
    expect(latest.title?.fieldState.invalid).toBe(true);

    act(() => latest.title?.field.onChange("unique"));
    expect(latest.title?.fieldState.error).toBeUndefined();
    expect(latest.title?.fieldState.invalid).toBe(false);
  });

  it("a root (form-level) ValidationError message never lands on a field", async () => {
    const save = vi.fn(async () => ({
      root: "app.errors.form_level",
      title: "app.errors.field_level",
    }));
    const { latest, latestForm } = setupForm<{ title: string }>(
      { defaultValues: { title: "x" }, save },
      [{ source: "title" }],
    );
    await act(async () => {});
    await act(async () => {
      await latestForm.current?.submit();
    });
    // The root message is reserved for the form-level slot — the field carries
    // ONLY its own field-addressed error.
    expect(latest.title?.fieldState.error).toBe("app.errors.field_level");
    expect(latestForm.current?.form.state.errors).toContain(
      "app.errors.form_level",
    );
  });
});

describe("parity: sticky isDirty vs isDefaultValue (unsaved-changes signal)", () => {
  it("isDirty latches sticky; isDefaultValue is the live deep-equality check", async () => {
    const save = vi.fn(async () => undefined as FieldErrors | undefined);
    const { latest, latestForm } = setupForm<{ title: string }>(
      { defaultValues: { title: "a" }, save },
      [{ source: "title" }],
    );
    await act(async () => {});
    expect(latestForm.current?.isDirty).toBe(false);
    expect(latestForm.current?.isDefaultValue).toBe(true);

    act(() => latest.title?.field.onChange("b"));
    expect(latestForm.current?.isDirty).toBe(true);
    expect(latestForm.current?.isDefaultValue).toBe(false);

    // Type the ORIGINAL value back: isDefaultValue returns true (deep-equal to
    // the baseline) while isDirty STAYS sticky (ever-modified). The
    // unsaved-changes guard uses !isDefaultValue, so it correctly clears.
    act(() => latest.title?.field.onChange("a"));
    expect(latestForm.current?.isDefaultValue).toBe(true);
    expect(latestForm.current?.isDirty).toBe(true);
  });
});

describe("parity: scalar-array ghost errors", () => {
  it("removing a scalar row revalidates the array (no stale error on a gone index)", async () => {
    const { wrapper } = makeWrapper();
    const latestArray: { current: ReturnType<typeof useArrayInput> | null } = {
      current: null,
    };
    const rowInputs: Record<string, UseInputResult | null> = {};
    function ScalarChild({ rowId }: { rowId: string }) {
      rowInputs[rowId] = useInput({
        source: "",
        // Each scalar entry is required — an empty entry errors.
        validate: [required()],
      });
      return null;
    }
    function Iterator() {
      const array = useArrayInput({ source: "tags" });
      latestArray.current = array;
      return (
        <ArrayInputProvider array={array}>
          {array.rows.map((row) => (
            <IteratorRowProvider key={row.id} row={row}>
              <ScalarChild rowId={row.id} />
            </IteratorRowProvider>
          ))}
        </ArrayInputProvider>
      );
    }
    const save = vi.fn(async () => undefined as FieldErrors | undefined);
    const latestForm: {
      current: ReturnType<typeof useForm<{ tags: string[] }>> | null;
    } = { current: null };
    function Host() {
      const form = useForm<{ tags: string[] }>({
        defaultValues: { tags: ["a", ""] },
        save,
      });
      latestForm.current = form;
      return (
        <CheloneFormProvider form={form.form} submit={form.submit}>
          <Iterator />
        </CheloneFormProvider>
      );
    }
    render(<Host />, { wrapper });
    await act(async () => {});
    expect(latestArray.current?.rows.length).toBe(2);

    // Submit fails: the empty required entry (tags[1]) errors.
    await act(async () => {
      await latestForm.current?.submit();
    });
    const emptyRowId = latestArray.current?.rows[1]?.id;
    if (emptyRowId) {
      expect(rowInputs[emptyRowId]?.fieldState.invalid).toBe(true);
    }

    // Remove the offending row. The remaining entry is valid and the submit
    // goes through — the removed index carries no ghost error (D8/#20 remove
    // revalidates from the removed index). Awaited: the removal schedules async
    // revalidation from the removed index, which must drain before the next
    // test (a bare sync act leaks a pending validation into the following
    // render, which React 19 absorbs as a throw — see array-hooks.test.tsx).
    await act(async () => {
      latestArray.current?.remove(1);
    });
    expect(latestArray.current?.rows.length).toBe(1);

    await act(async () => {
      await latestForm.current?.submit();
    });
    expect(save).toHaveBeenCalledExactlyOnceWith({ tags: ["a"] });
  });
});

describe("parity: checkbox value handling", () => {
  it("a checkbox change event yields target.checked (boolean), not a string", async () => {
    const save = vi.fn(async () => undefined as FieldErrors | undefined);
    const { latest, latestForm } = setupForm<{ done: boolean }>(
      { defaultValues: { done: false }, save },
      [{ source: "done" }],
    );
    await act(async () => {});
    act(() =>
      latest.done?.field.onChange({
        target: { type: "checkbox", checked: true },
      }),
    );
    expect(latestForm.current?.form.state.values.done).toBe(true);

    act(() =>
      latest.done?.field.onChange({
        target: { type: "checkbox", checked: false },
      }),
    );
    expect(latestForm.current?.form.state.values.done).toBe(false);
  });

  it("a raw boolean value passes through untouched (custom toggle payload)", async () => {
    const save = vi.fn(async () => undefined as FieldErrors | undefined);
    const { latest, latestForm } = setupForm<{ done: boolean }>(
      { defaultValues: { done: false }, save },
      [{ source: "done" }],
    );
    await act(async () => {});
    act(() => latest.done?.field.onChange(true));
    expect(latestForm.current?.form.state.values.done).toBe(true);
  });
});

describe("parity: create-form defaults + reconciliation", () => {
  it("seeds defaults, and a ValidationError on create surfaces on the field", async () => {
    const { wrapper, dataProvider } = makeWrapper();
    const latest: {
      create: ReturnType<
        typeof useCreateForm<typeof resources, "posts">
      > | null;
      title: UseInputResult | null;
    } = { create: null, title: null };
    function TitleInput() {
      latest.title = useInput({ source: "title" });
      return null;
    }
    function CreateHost() {
      const createForm = useCreateForm<typeof resources, "posts">("posts", {
        defaultValues: { title: "draft" },
      });
      latest.create = createForm;
      return (
        <CheloneFormProvider form={createForm.form} submit={createForm.submit}>
          <TitleInput />
        </CheloneFormProvider>
      );
    }
    render(<CreateHost />, { wrapper });
    await act(async () => {});
    expect(latest.title?.field.value).toBe("draft");

    vi.spyOn(dataProvider, "create").mockRejectedValueOnce(
      new ValidationError("app.errors.invalid", {
        title: "app.errors.title_taken",
      }),
    );
    await act(async () => {
      await latest.create?.submit();
    });
    expect(latest.title?.fieldState.error).toBe("app.errors.title_taken");

    // Fixing clears the server error inline.
    act(() => latest.title?.field.onChange("fixed"));
    expect(latest.title?.fieldState.error).toBeUndefined();
  });
});
