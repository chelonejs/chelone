import {
  createArraySourceScope,
  createFormController,
  createNotificationStore,
  createRowSourceScope,
  createStore,
  defineResources,
  type FieldErrors,
  fakeDataProvider,
  required,
  rootSourceScope,
  ValidationError,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { memo, type ReactNode, StrictMode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import {
  CheloneFormProvider,
  SourceContextProvider,
  useWrappedSource,
} from "./form-context";
import {
  type UseInputResult,
  useCreateForm,
  useEditForm,
  useForm,
  useFormController,
  useInput,
} from "./form-hooks";
import { RouterAdapterProvider } from "./router/adapter";
import { useLocation } from "./router/nav-hooks";
import { reactRouterAdapter } from "./router/react-router-adapter";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
const rows = Array.from({ length: 3 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
}));

function makeWrapper({
  strict = false,
  withResources = false,
}: {
  strict?: boolean;
  withResources?: boolean;
} = {}) {
  const notifications = createNotificationStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const dataProvider = fakeDataProvider<typeof resources>({
    posts: structuredClone(rows),
  });
  const store = createStore();
  const inner = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      notifications={notifications}
      resources={withResources ? resources : undefined}
    >
      {children}
    </CheloneProvider>
  );
  const wrapper = strict
    ? ({ children }: { children: ReactNode }) => (
        <StrictMode>{inner({ children })}</StrictMode>
      )
    : inner;
  return { wrapper, notifications, queryClient, dataProvider, store };
}

/** A form host rendering `useForm` + provider around input consumers. */
interface FormHarness<TFormData> {
  latestForm: { current: ReturnType<typeof useForm<TFormData>> | null };
  FormHost: (props: { children: ReactNode }) => ReactNode;
}

function makeFormHarness<TFormData>(options: {
  defaultValues?: TFormData;
  save: (data: TFormData) => Promise<FieldErrors | undefined>;
}): FormHarness<TFormData> {
  const latestForm: FormHarness<TFormData>["latestForm"] = { current: null };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>(options);
    latestForm.current = form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  return { latestForm, FormHost };
}

/** Renders a single useInput consumer inside a fresh form + provider stack. */
function setupInput<TFormData>(
  formOptions: {
    defaultValues?: TFormData;
    save: (data: TFormData) => Promise<FieldErrors | undefined>;
  },
  inputOptions: Parameters<typeof useInput>[0],
  { strict = false }: { strict?: boolean } = {},
) {
  const base = makeWrapper({ strict });
  const Wrapper = base.wrapper;
  const harness = makeFormHarness<TFormData>(formOptions);
  const latestInput: { current: UseInputResult | null } = { current: null };
  function Input() {
    latestInput.current = useInput(inputOptions);
    return null;
  }
  const view = render(
    <Wrapper>
      <harness.FormHost>
        <Input />
      </harness.FormHost>
    </Wrapper>,
  );
  return { ...base, ...harness, latestInput, view };
}

describe("useInput", () => {
  it("binds with ra defaults: null renders as '', clearing stores null", async () => {
    const save = vi.fn(async () => undefined);
    const { latestInput, latestForm } = setupInput<{ title: string | null }>(
      { defaultValues: { title: null }, save },
      { source: "title" },
    );
    await act(async () => {});
    expect(latestInput.current?.field.name).toBe("title");
    expect(latestInput.current?.field.value).toBe("");

    act(() => latestInput.current?.field.onChange("hello"));
    expect(latestInput.current?.field.value).toBe("hello");
    expect(latestForm.current?.form.state.values.title).toBe("hello");

    act(() => latestInput.current?.field.onChange(""));
    expect(latestForm.current?.form.state.values.title).toBeNull();
    expect(latestInput.current?.field.value).toBe("");
  });

  it("applies format every render, parses on change, chains the user handler AFTER the write", async () => {
    const save = vi.fn(async () => undefined);
    const seenAtUserHandler: unknown[] = [];
    const onChange = vi.fn((eventOrValue?: unknown) => {
      seenAtUserHandler.push(eventOrValue);
    });
    const { latestInput, latestForm } = setupInput<{ code: string }>(
      { defaultValues: { code: "ab" }, save },
      {
        source: "code",
        format: (value) => `[${String(value)}]`,
        parse: (input) => String(input).toUpperCase(),
        onChange,
      },
    );
    await act(async () => {});
    expect(latestInput.current?.field.value).toBe("[ab]");

    act(() => latestInput.current?.field.onChange("cd"));
    expect(latestForm.current?.form.state.values.code).toBe("CD");
    expect(latestInput.current?.field.value).toBe("[CD]");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("cd");

    // format is applied to PROGRAMMATIC writes too — every render re-formats
    // (setFieldValue bypasses parse by design; format still runs on read).
    act(() => latestForm.current?.form.setFieldValue("code", "zz"));
    expect(latestInput.current?.field.value).toBe("[zz]");
    expect(seenAtUserHandler).toEqual(["cd"]);
  });

  it("extracts checkbox events (target.checked) and text events (target.value)", async () => {
    const save = vi.fn(async () => undefined);
    const { latestInput, latestForm } = setupInput<{
      done: boolean;
      title: string;
    }>({ defaultValues: { done: false, title: "" }, save }, { source: "done" });
    await act(async () => {});
    act(() =>
      latestInput.current?.field.onChange({
        target: { type: "checkbox", checked: true },
      }),
    );
    expect(latestForm.current?.form.state.values.done).toBe(true);

    act(() =>
      latestInput.current?.field.onChange({
        target: { type: "text", value: "typed" },
      }),
    );
    expect(latestForm.current?.form.state.values.done).toBe("typed");
  });

  it("uses the id prop when given and a useId fallback otherwise", async () => {
    const save = vi.fn(async () => undefined);
    const explicit = setupInput<{ a: string }>(
      { defaultValues: { a: "" }, save },
      { source: "a", id: "my-input" },
    );
    await act(async () => {});
    expect(explicit.latestInput.current?.id).toBe("my-input");

    const fallback = setupInput<{ a: string }>(
      { defaultValues: { a: "" }, save },
      { source: "a" },
    );
    await act(async () => {});
    expect(fallback.latestInput.current?.id).toBeTruthy();
    expect(fallback.latestInput.current?.id).not.toBe("my-input");
  });

  it("detects requiredness from the isRequired prop OR a required() validator", async () => {
    const save = vi.fn(async () => undefined);
    const viaValidator = setupInput<{ a: string }>(
      { defaultValues: { a: "" }, save },
      { source: "a", validate: [required()] },
    );
    await act(async () => {});
    expect(viaValidator.latestInput.current?.isRequired).toBe(true);

    const viaProp = setupInput<{ a: string }>(
      { defaultValues: { a: "" }, save },
      { source: "a", isRequired: true },
    );
    await act(async () => {});
    expect(viaProp.latestInput.current?.isRequired).toBe(true);

    const neither = setupInput<{ a: string }>(
      { defaultValues: { a: "" }, save },
      { source: "a" },
    );
    await act(async () => {});
    expect(neither.latestInput.current?.isRequired).toBe(false);
  });

  it("surfaces submit-time validation on fieldState and re-validates on change (D6)", async () => {
    const save = vi.fn(async () => undefined);
    const { latestInput, latestForm } = setupInput<{ title: string }>(
      { defaultValues: { title: "" }, save },
      { source: "title", validate: [required()] },
    );
    await act(async () => {});
    expect(latestInput.current?.fieldState.invalid).toBe(false);

    await act(async () => {
      await latestForm.current?.submit();
    });
    expect(save).not.toHaveBeenCalled();
    expect(latestInput.current?.fieldState.invalid).toBe(true);
    expect(latestInput.current?.fieldState.error).toBe(
      "chelone.validation.required",
    );

    // Failed submission latches revalidate-on-change: fixing clears inline.
    act(() => latestInput.current?.field.onChange("fixed"));
    expect(latestInput.current?.fieldState.invalid).toBe(false);
    expect(latestInput.current?.fieldState.error).toBeUndefined();

    await act(async () => {
      await latestForm.current?.submit();
    });
    expect(save).toHaveBeenCalledExactlyOnceWith({ title: "fixed" });
  });

  it("server fieldErrors land on the input and auto-clear on the next edit (D4)", async () => {
    const save = vi
      .fn<(data: { title: string }) => Promise<FieldErrors | undefined>>()
      .mockResolvedValueOnce({ title: "app.errors.title_taken" })
      .mockResolvedValue(undefined);
    const { latestInput, latestForm } = setupInput<{ title: string }>(
      { defaultValues: { title: "dup" }, save },
      { source: "title" },
    );
    await act(async () => {});
    await act(async () => {
      await latestForm.current?.submit();
    });
    expect(latestInput.current?.fieldState.error).toBe(
      "app.errors.title_taken",
    );
    expect(latestInput.current?.fieldState.invalid).toBe(true);

    act(() => latestInput.current?.field.onChange("unique"));
    expect(latestInput.current?.fieldState.error).toBeUndefined();
    expect(latestInput.current?.fieldState.invalid).toBe(false);
  });

  it("tracks touched/dirty through blur and change", async () => {
    const save = vi.fn(async () => undefined);
    const onBlur = vi.fn();
    const { latestInput } = setupInput<{ a: string }>(
      { defaultValues: { a: "" }, save },
      { source: "a", onBlur },
    );
    await act(async () => {});
    expect(latestInput.current?.fieldState.isTouched).toBe(false);
    expect(latestInput.current?.fieldState.isDirty).toBe(false);

    // Blur marks touched (ra/RHF parity: touched = blurred) but never dirty.
    act(() => latestInput.current?.field.onBlur());
    expect(latestInput.current?.fieldState.isTouched).toBe(true);
    expect(latestInput.current?.fieldState.isDirty).toBe(false);
    expect(onBlur).toHaveBeenCalledTimes(1);

    act(() => latestInput.current?.field.onChange("x"));
    expect(latestInput.current?.fieldState.isTouched).toBe(true);
    expect(latestInput.current?.fieldState.isDirty).toBe(true);
  });

  it("throws a clear error without a <CheloneFormProvider>", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useInput({ source: "a" }))).toThrow(
        /CheloneFormProvider/,
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("field isolation smoke: typing into A never re-renders B's consumer", async () => {
    const save = vi.fn(async () => undefined);
    const base = makeWrapper();
    const Wrapper = base.wrapper;
    const harness = makeFormHarness<{ a: string; b: string }>({
      defaultValues: { a: "", b: "" },
      save,
    });
    const renders = { a: 0, b: 0 };
    const latestA: { current: UseInputResult | null } = { current: null };
    const latestB: { current: UseInputResult | null } = { current: null };
    const FieldA = memo(function FieldA() {
      renders.a += 1;
      latestA.current = useInput({ source: "a" });
      return null;
    });
    const FieldB = memo(function FieldB() {
      renders.b += 1;
      latestB.current = useInput({ source: "b" });
      return null;
    });
    render(
      <Wrapper>
        <harness.FormHost>
          <FieldA />
          <FieldB />
        </harness.FormHost>
      </Wrapper>,
    );
    await act(async () => {});
    const aBefore = renders.a;
    const bBefore = renders.b;
    for (const text of ["x", "xy", "xyz", "xyzw", "xyzwv"]) {
      act(() => latestA.current?.field.onChange(text));
    }
    expect(latestA.current?.field.value).toBe("xyzwv");
    expect(renders.a).toBeGreaterThanOrEqual(aBefore + 5);
    // The B consumer never re-rendered: field.store identity-memoization +
    // per-field subscription = render isolation (T9 pins the full budget).
    expect(renders.b).toBe(bBefore);
    expect(latestB.current?.field.value).toBe("");
  });

  it("StrictMode double-mount: field stays registered, validation and submit work", async () => {
    const save = vi.fn(async () => undefined);
    const { latestInput, latestForm } = setupInput<{ title: string }>(
      { defaultValues: { title: "" }, save },
      { source: "title", validate: [required()] },
      { strict: true },
    );
    await act(async () => {});
    act(() => latestInput.current?.field.onChange("hello"));
    expect(latestInput.current?.field.value).toBe("hello");

    await act(async () => {
      await latestForm.current?.submit();
    });
    // The remounted (not the discarded) field instance is registered —
    // submit-time validation saw it and the value flowed through.
    expect(save).toHaveBeenCalledExactlyOnceWith({ title: "hello" });

    // The success reset re-pristined the form (revalidate-on-change is
    // latched by a FAILED submission only) — but submit-time validation is
    // still wired to the remounted instance: clearing and resubmitting is
    // blocked with the error on the field.
    act(() => latestInput.current?.field.onChange(""));
    await act(async () => {
      await latestForm.current?.submit();
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(latestInput.current?.fieldState.invalid).toBe(true);
    expect(latestInput.current?.fieldState.error).toBe(
      "chelone.validation.required",
    );
  });
});

describe("SourceContext", () => {
  it("useWrappedSource composes row paths; labels stay index-free", async () => {
    const scope = createRowSourceScope(
      createArraySourceScope(rootSourceScope, "items"),
      0,
    );
    const { result } = renderHook(() => useWrappedSource("sku"), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <SourceContextProvider scope={scope}>{children}</SourceContextProvider>
      ),
    });
    expect(result.current).toBe("items[0].sku");
    expect(scope.getLabel("sku")).toBe("items.sku");
  });

  it("defaults to the identity scope and scopes useInput bindings per row", async () => {
    const { result } = renderHook(() => useWrappedSource("title"));
    expect(result.current).toBe("title");

    const save = vi.fn(async () => undefined);
    const base = makeWrapper();
    const Wrapper = base.wrapper;
    const harness = makeFormHarness<{ items: Array<{ sku: string }> }>({
      defaultValues: { items: [{ sku: "s-0" }, { sku: "s-1" }] },
      save,
    });
    const latestInput: { current: UseInputResult | null } = { current: null };
    function RowInput() {
      latestInput.current = useInput({ source: "sku" });
      return null;
    }
    const rowScope = createRowSourceScope(
      createArraySourceScope(rootSourceScope, "items"),
      1,
    );
    render(
      <Wrapper>
        <harness.FormHost>
          <SourceContextProvider scope={rowScope}>
            <RowInput />
          </SourceContextProvider>
        </harness.FormHost>
      </Wrapper>,
    );
    await act(async () => {});
    expect(latestInput.current?.field.name).toBe("items[1].sku");
    expect(latestInput.current?.field.value).toBe("s-1");

    act(() => latestInput.current?.field.onChange("s-1-edited"));
    expect(harness.latestForm.current?.form.state.values.items?.[1]?.sku).toBe(
      "s-1-edited",
    );
    expect(rootSourceScope.getSource("x")).toBe("x");
  });

  it("useInput with a dot-index source writes the field that the bracket source reads", async () => {
    const save = vi.fn(async () => undefined);
    const base = makeWrapper();
    const Wrapper = base.wrapper;
    const harness = makeFormHarness<{ tags: Array<{ label: string }> }>({
      defaultValues: { tags: [{ label: "start" }] },
      save,
    });
    const dot: { current: UseInputResult | null } = { current: null };
    const bracket: { current: UseInputResult | null } = { current: null };
    function DotInput() {
      dot.current = useInput({ source: "tags.0.label" });
      return null;
    }
    function BracketInput() {
      bracket.current = useInput({ source: "tags[0].label" });
      return null;
    }
    render(
      <Wrapper>
        <harness.FormHost>
          <DotInput />
          <BracketInput />
        </harness.FormHost>
      </Wrapper>,
    );
    await act(async () => {});

    // Both spellings resolve to the same field name — the one form-core
    // addresses, so validators, errors and field groups match it too.
    expect(dot.current?.field.name).toBe("tags[0].label");
    expect(bracket.current?.field.name).toBe("tags[0].label");
    expect(dot.current?.field.value).toBe("start");

    act(() => dot.current?.field.onChange("from-dot"));
    expect(harness.latestForm.current?.form.state.values.tags[0]?.label).toBe(
      "from-dot",
    );
    expect(bracket.current?.field.value).toBe("from-dot");

    act(() => bracket.current?.field.onChange("from-bracket"));
    expect(dot.current?.field.value).toBe("from-bracket");
  });
});

describe("useFormController", () => {
  it("bridges an externally created vanilla controller (slices + submit)", async () => {
    const save = vi.fn(async () => undefined);
    const controller = createFormController<{ title: string }>({
      defaultValues: { title: "a" },
      save,
    });
    const { result } = renderHook(() => useFormController(controller));
    expect(result.current.form).toBe(controller.form);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isDefaultValue).toBe(true);
    expect(result.current.canSubmit).toBe(true);

    act(() => controller.form.setFieldValue("title", "b"));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.isDefaultValue).toBe(false);

    await act(async () => {
      await result.current.submit();
    });
    expect(save).toHaveBeenCalledExactlyOnceWith({ title: "b" });
    // D5: success rebaselines — the dirty signal resets.
    expect(result.current.isDefaultValue).toBe(true);
  });
});

describe("useEditForm", () => {
  it("end-to-end: load -> hydrate -> edit -> server error -> fix -> save -> reconcile", async () => {
    const { wrapper: Wrapper, dataProvider } = makeWrapper();
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
    render(
      <Wrapper>
        <EditHost />
      </Wrapper>,
    );

    // Record loads and hydrates the form WITHOUT dirtying it.
    await waitFor(() => expect(latest.edit?.record?.title).toBe("t1"));
    await waitFor(() => expect(latest.title?.field.value).toBe("t1"));
    expect(latest.edit?.isDirty).toBe(false);
    expect(latest.edit?.isDefaultValue).toBe(true);

    act(() => latest.title?.field.onChange("t1 edited"));
    expect(latest.edit?.isDefaultValue).toBe(false);

    // Server rejects the first save with a field-addressed ValidationError.
    vi.spyOn(dataProvider, "update").mockRejectedValueOnce(
      new ValidationError("app.errors.invalid", {
        title: "app.errors.title_taken",
      }),
    );
    await act(async () => {
      await latest.edit?.submit();
    });
    expect(latest.title?.fieldState.error).toBe("app.errors.title_taken");
    expect(latest.title?.fieldState.invalid).toBe(true);

    // Fixing the field auto-clears the server error (onSubmit channel).
    act(() => latest.title?.field.onChange("t1 fixed"));
    expect(latest.title?.fieldState.error).toBeUndefined();

    // Second save succeeds; the form reconciles with SERVER truth (D5).
    await act(async () => {
      await latest.edit?.submit();
    });
    await waitFor(() => expect(latest.edit?.isDefaultValue).toBe(true));
    expect(latest.title?.field.value).toBe("t1 fixed");
    await waitFor(() => expect(latest.edit?.record?.title).toBe("t1 fixed"));
    expect(latest.edit?.isDirty).toBe(false);
  });
});

describe("useCreateForm", () => {
  it("seeds defaults, creates on submit, and rebaselines on the created record", async () => {
    const { wrapper: Wrapper, dataProvider } = makeWrapper();
    const createSpy = vi.spyOn(dataProvider, "create");
    const onRedirect = vi.fn();
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
        onRedirect,
      });
      latest.create = createForm;
      return (
        <CheloneFormProvider form={createForm.form} submit={createForm.submit}>
          <TitleInput />
        </CheloneFormProvider>
      );
    }
    render(
      <Wrapper>
        <CreateHost />
      </Wrapper>,
    );
    await act(async () => {});
    expect(latest.title?.field.value).toBe("draft");
    expect(latest.create?.isPending).toBe(false);

    act(() => latest.title?.field.onChange("brand new"));
    await act(async () => {
      await latest.create?.submit();
    });
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(onRedirect).toHaveBeenCalledWith(
      "edit",
      "posts",
      expect.anything(),
      expect.objectContaining({ title: "brand new" }),
    );
    // Rebaselined on the CREATED record — dirty signal reset.
    expect(latest.create?.isDefaultValue).toBe(true);
    expect(latest.title?.field.value).toBe("brand new");
  });

  it("wires the registry zod schema as the default validator (D6)", async () => {
    const { wrapper: Wrapper, dataProvider } = makeWrapper({
      withResources: true,
    });
    const createSpy = vi.spyOn(dataProvider, "create");
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
        // The posts schema requires id:number — a create form has no id, so
        // give it one via defaults to keep the schema satisfiable and let
        // title carry the failure.
        defaultValues: { id: 99, title: 123 as unknown as string },
      });
      latest.create = createForm;
      return (
        <CheloneFormProvider form={createForm.form} submit={createForm.submit}>
          <TitleInput />
        </CheloneFormProvider>
      );
    }
    render(
      <Wrapper>
        <CreateHost />
      </Wrapper>,
    );
    await act(async () => {});

    // title is a number — the registry schema blocks the submit.
    await act(async () => {
      await latest.create?.submit();
    });
    expect(createSpy).not.toHaveBeenCalled();
    expect(latest.title?.fieldState.invalid).toBe(true);
    expect(typeof latest.title?.fieldState.error).toBe("string");

    // Fixing the field clears inline and the resubmit goes through.
    act(() => latest.title?.field.onChange("valid title"));
    expect(latest.title?.fieldState.invalid).toBe(false);
    await act(async () => {
      await latest.create?.submit();
    });
    expect(createSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Redirect-on-save: real router navigates to the list; standalone no-ops.
// ---------------------------------------------------------------------------

describe("useEditForm redirect-on-save", () => {
  it("inside a RouterAdapter: a successful save navigates to the resource list (ra-core parity)", async () => {
    const { wrapper: Inner, dataProvider } = makeWrapper();
    const updateSpy = vi.spyOn(dataProvider, "update");
    const location: { pathname: string | null } = { pathname: null };
    const latest: {
      edit: ReturnType<typeof useEditForm<typeof resources, "posts">> | null;
    } = { edit: null };
    function CaptureLocation() {
      location.pathname = useLocation().pathname;
      return null;
    }
    function EditHost() {
      // No `onRedirect` override — the hook wires the ambient router's redirect,
      // so `onDefaultSuccess` -> `onRedirect("list", "posts", …)` navigates.
      latest.edit = useEditForm<typeof resources, "posts">("posts", { id: 1 });
      return null;
    }
    render(
      <Inner>
        <RouterAdapterProvider adapter={reactRouterAdapter}>
          <MemoryRouter initialEntries={["/posts/1"]}>
            <CaptureLocation />
            <EditHost />
          </MemoryRouter>
        </RouterAdapterProvider>
      </Inner>,
    );

    await waitFor(() => expect(latest.edit?.record?.title).toBe("t1"));
    expect(location.pathname).toBe("/posts/1");

    await act(async () => {
      await latest.edit?.submit();
    });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    // ra-core parity: the edit view redirects to the list after a save.
    await waitFor(() => expect(location.pathname).toBe("/posts"));
  });

  it("without a RouterAdapter: a successful save resolves and does NOT throw (redirect degrades to a no-op)", async () => {
    const { wrapper: Wrapper, dataProvider } = makeWrapper();
    const updateSpy = vi.spyOn(dataProvider, "update");
    const latest: {
      edit: ReturnType<typeof useEditForm<typeof resources, "posts">> | null;
    } = { edit: null };
    function EditHost() {
      latest.edit = useEditForm<typeof resources, "posts">("posts", { id: 1 });
      return null;
    }
    // No router anywhere in the tree — mounting must not throw.
    expect(() =>
      render(
        <Wrapper>
          <EditHost />
        </Wrapper>,
      ),
    ).not.toThrow();

    await waitFor(() => expect(latest.edit?.record?.title).toBe("t1"));

    // The save (which requests a redirect on success) resolves cleanly — the
    // no-op redirect swallows the request instead of throwing.
    await act(async () => {
      await expect(latest.edit?.submit()).resolves.toBeUndefined();
    });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    // The record reconciled with server truth — the save actually landed.
    await waitFor(() => expect(latest.edit?.isDefaultValue).toBe(true));
  });
});
