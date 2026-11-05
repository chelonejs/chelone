/**
 * P7b INPUT-INTEGRATION PROBE — proves the ported simple inputs work
 * end-to-end inside ONE real `<CheloneFormProvider>` form (text + number +
 * boolean + date together), not just in isolation.
 *
 * What this probe pins that the per-input specs do not:
 *  - All four inputs share ONE form; each reads/writes its own `source` off a
 *    single `form.store` without cross-talk.
 *  - The written value is read back off `form.store.state.values` (the actual
 *    stored shape), verifying parse: empty text → null, checkbox → boolean,
 *    date → the "YYYY-MM-DD" string, number → a JS number (not a string).
 *  - The load-bearing error-shape fixup: a failing validator surfaces its
 *    message THROUGH `<ValidationError>` as a TRANSLATED string — not
 *    `[object Object]`, not a raw `@@react-admin@@`-prefixed key. This assertion
 *    is mutation-verified (see p7b-probe.md): breaking `<ValidationError>`'s
 *    render turns it red; reverting turns it green.
 *  - The `ui/` primitives (Input, Switch, Field, FieldError, FieldLabel) mount
 *    with NO console.error.
 *
 * jsdom applies no CSS: assert DOM structure/roles/values/stored-shape and
 * behavior only, never visual styling.
 */
import {
  createI18n,
  defineMessages,
  type FieldErrors,
  fakeDataProvider,
  required,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { BooleanInput } from "./boolean-input";
import { DateInput } from "./date-input";
import { NumberInput } from "./number-input";
import { TextInput } from "./text-input";

const messages = {
  en: defineMessages({
    // The default required key chelone's `required()` validator emits.
    "chelone.validation.required": "This field is required",
  }),
};

function makeWrapper() {
  const i18n = createI18n({ locale: "en", messages });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

/** The live FormApi, typed as `useForm` returns it. */
interface FormRef<TFormData> {
  current: ReturnType<typeof useForm<TFormData>>["form"] | null;
}

/**
 * Mount arbitrary inputs inside one real form + provider stack. Exposes the
 * submit pipeline and the live FormApi so a test can read `form.store` directly.
 */
function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    save = async () => undefined,
    onData,
  }: {
    defaultValues?: TFormData;
    save?: (data: TFormData) => Promise<FieldErrors | undefined>;
    onData?: (data: TFormData) => void;
  } = {},
) {
  const Wrapper = makeWrapper();
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  const formRef: FormRef<TFormData> = { current: null };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({
      defaultValues,
      save: async (data) => {
        onData?.(data);
        return save(data);
      },
    });
    submitRef.current = form.submit;
    formRef.current = form.form;
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  const view = render(
    <Wrapper>
      <FormHost>{ui}</FormHost>
    </Wrapper>,
  );
  return { view, submitRef, formRef };
}

/** Read the live stored value at `source` off the form store. */
function storeValue<TFormData extends Record<string, unknown>>(
  formRef: FormRef<TFormData>,
  source: string,
): unknown {
  return formRef.current?.store.state.values[source];
}

interface PostForm extends Record<string, unknown> {
  title: string | null;
  views: number | null;
  is_published: boolean | null;
  published_at: string | null;
}

/** All four P7b inputs mounted in one form. */
function AllInputs() {
  return (
    <>
      <TextInput source="title" validate={required()} />
      <NumberInput source="views" />
      <BooleanInput source="is_published" />
      <DateInput source="published_at" />
    </>
  );
}

/**
 * Fetch a control by its field `name` attribute. `getByLabelText` is unreliable
 * here: the required `<TextInput>` renders a thin-space asterisk sibling in the
 * label, so its accessible name is "Title *" not "Title". Querying by `name`
 * (the `source`) is exact and marker-agnostic.
 */
function control(name: string): HTMLInputElement {
  const el = document.querySelector(
    `[name="${name}"]`,
  ) as HTMLInputElement | null;
  if (!el) throw new Error(`no control with name="${name}"`);
  return el;
}

afterEach(() => cleanup());

describe("P7b input-integration probe (one form, four inputs)", () => {
  it("(a) renders every label + control", () => {
    setup<PostForm>(<AllInputs />, {
      defaultValues: {
        title: "War and Peace",
        views: 12,
        is_published: false,
        published_at: "2024-01-02",
      },
    });

    // Text: labelled text input, prefilled. (Label carries the required
    // marker, so match the visible label text and the control separately.)
    const title = control("title");
    expect(title.tagName).toBe("INPUT");
    expect(title.getAttribute("type")).toBe("text");
    expect(title.value).toBe("War and Peace");
    expect(screen.getByText(/^Title/).closest("label")).not.toBeNull();

    // Number: labelled number input, prefilled.
    const views = control("views");
    expect(views.getAttribute("type")).toBe("number");
    expect(views.value).toBe("12");
    expect(screen.getByLabelText("Views")).toBe(views);

    // Boolean: labelled switch.
    const sw = screen.getByRole("switch");
    expect(screen.getByLabelText("Is published")).toBe(sw);
    expect(sw.getAttribute("aria-checked")).toBe("false");

    // Date: labelled date input, prefilled with the bare-date string.
    const date = control("published_at");
    expect(date.getAttribute("type")).toBe("date");
    expect(date.value).toBe("2024-01-02");
    expect(screen.getByLabelText("Published at")).toBe(date);
  });

  it("(b) typing/toggling/picking writes the correctly-parsed shape to form.store", () => {
    const { formRef } = setup<PostForm>(<AllInputs />, {
      defaultValues: {
        title: "seed",
        views: 1,
        is_published: false,
        published_at: "2024-01-02",
      },
    });

    // Text: type -> string stored.
    fireEvent.change(control("title"), { target: { value: "hello" } });
    expect(storeValue(formRef, "title")).toBe("hello");

    // Text: empty -> null (ra default parse), NOT "".
    fireEvent.change(control("title"), { target: { value: "" } });
    expect(storeValue(formRef, "title")).toBeNull();

    // Number: type -> a JS number (not the string "42").
    fireEvent.change(control("views"), { target: { value: "42" } });
    expect(storeValue(formRef, "views")).toBe(42);
    expect(typeof storeValue(formRef, "views")).toBe("number");

    // Number: empty -> null (so required still fires; not 0).
    fireEvent.change(control("views"), { target: { value: "" } });
    expect(storeValue(formRef, "views")).toBeNull();

    // Boolean: toggle -> literal boolean true.
    fireEvent.click(screen.getByRole("switch"));
    expect(storeValue(formRef, "is_published")).toBe(true);

    // Date: pick -> the bare "YYYY-MM-DD" string shape.
    fireEvent.change(control("published_at"), {
      target: { value: "2025-06-15" },
    });
    expect(storeValue(formRef, "published_at")).toBe("2025-06-15");
  });

  it("(c) a failing validator surfaces its message THROUGH <ValidationError> as a translated string", async () => {
    const { submitRef } = setup<PostForm>(<AllInputs />, {
      defaultValues: {
        title: null,
        views: 1,
        is_published: false,
        published_at: "2024-01-02",
      },
    });

    // Pristine -> no error shown.
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => {
      await submitRef.current?.();
    });

    // The error renders in the field-error slot as the TRANSLATED string.
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-slot")).toBe("field-error");
    const text = alert.textContent ?? "";
    // Load-bearing: the translated message, NOT the object or the raw key.
    expect(text).toBe("This field is required");
    expect(text).not.toContain("[object Object]");
    expect(text).not.toContain("@@react-admin@@");
    // Not the untranslated key leaking through either.
    expect(text).not.toContain("chelone.validation.required");
  });

  it("(d) isRequired renders the required marker on the required field only", () => {
    setup<PostForm>(<AllInputs />, {
      defaultValues: {
        title: "",
        views: 1,
        is_published: false,
        published_at: "2024-01-02",
      },
    });

    // Required title carries the thin-space asterisk.
    expect((screen.getByText("Title").textContent ?? "").includes("*")).toBe(
      true,
    );
    // Non-required fields do NOT.
    expect((screen.getByText("Views").textContent ?? "").includes("*")).toBe(
      false,
    );
    expect(
      (screen.getByText("Is published").textContent ?? "").includes("*"),
    ).toBe(false);
  });

  it("mounts the ui/ primitives without any console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      setup<PostForm>(<AllInputs />, {
        defaultValues: {
          title: "x",
          views: 3,
          is_published: true,
          published_at: "2024-01-02",
        },
      });
      // Sanity: the tree actually rendered the primitives.
      expect(control("title")).toBeTruthy();
      expect(screen.getByRole("switch")).toBeTruthy();
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps sibling inputs independent (writing one leaves the others untouched)", () => {
    const { formRef } = setup<PostForm>(<AllInputs />, {
      defaultValues: {
        title: "keep",
        views: 7,
        is_published: true,
        published_at: "2024-01-02",
      },
    });

    // Toggle the boolean; every other field keeps its seeded value.
    fireEvent.click(screen.getByRole("switch"));
    expect(storeValue(formRef, "is_published")).toBe(false);
    expect(storeValue(formRef, "title")).toBe("keep");
    expect(storeValue(formRef, "views")).toBe(7);
    expect(storeValue(formRef, "published_at")).toBe("2024-01-02");

    // The other-field error slot is clean (only the boolean changed).
    const titleField = control("title").closest("[data-slot='field']");
    if (titleField) {
      expect(within(titleField as HTMLElement).queryByRole("alert")).toBeNull();
    }
  });
});
