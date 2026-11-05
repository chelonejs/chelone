/**
 * P7c-T3 — `<FileInput>` ported onto chelone `useInput` + `ui/field` +
 * `<ValidationError>`, with a per-file `<RecordContextProvider>` around each
 * preview child (P7a `useRecordContext`) and `shallowEqual`-based removal.
 * jsdom applies no CSS: assert DOM/roles/values and behavior — the file <input>,
 * the humanized label, the per-file record published to the preview child, the
 * remove button, and the error slot — never visual styling.
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
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useRecordContext } from "../../../record/record-context";
import { FileInput } from "./file-input";

const messages = {
  en: defineMessages({
    "chelone.validation.required": "Required",
  }),
};

/** Preview child: renders the per-file record `src`/`title` as a link. */
function FilePreviewChild() {
  const record = useRecordContext<{ src?: string; title?: string }>();
  return (
    <a href={record?.src} title={record?.title}>
      {record?.title ?? record?.src}
    </a>
  );
}

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

function setup<TFormData extends Record<string, unknown>>(
  ui: ReactNode,
  {
    defaultValues,
    save = async () => undefined,
  }: {
    defaultValues?: TFormData;
    save?: (data: TFormData) => Promise<FieldErrors | undefined>;
  } = {},
) {
  const Wrapper = makeWrapper();
  const submitRef: { current: (() => Promise<void>) | null } = {
    current: null,
  };
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm<TFormData>({ defaultValues, save });
    submitRef.current = form.submit;
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
  return { view, submitRef };
}

afterEach(() => cleanup());

describe("<FileInput>", () => {
  it("renders a file input with the humanized field label", () => {
    setup(
      <FileInput source="attachments" multiple>
        <FilePreviewChild />
      </FileInput>,
      { defaultValues: { attachments: [] } },
    );
    // The dropzone renders a hidden <input type="file">.
    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(screen.getByText("Attachments")).not.toBeNull();
  });

  it("publishes each existing file to its preview child via RecordContext", () => {
    setup(
      <FileInput source="attachments" multiple>
        <FilePreviewChild />
      </FileInput>,
      {
        defaultValues: {
          attachments: [
            { src: "https://example.org/a.pdf", title: "Cover" },
            { src: "https://example.org/b.png", title: "Plan" },
          ],
        },
      },
    );
    // Each file's record surfaces through the per-file RecordContextProvider.
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    const [firstLink, secondLink] = links;
    if (!firstLink || !secondLink) throw new Error("expected 2 links");
    expect(firstLink).toHaveProperty("href", "https://example.org/a.pdf");
    expect(firstLink.getAttribute("title")).toBe("Cover");
    expect(secondLink.getAttribute("title")).toBe("Plan");
  });

  it("wraps a single (non-array) value into one preview", () => {
    setup(
      <FileInput source="avatar">
        <FilePreviewChild />
      </FileInput>,
      {
        defaultValues: {
          avatar: { src: "https://example.org/me.png", title: "Me" },
        },
      },
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    const [firstLink] = links;
    if (!firstLink) throw new Error("expected 1 link");
    expect(firstLink.getAttribute("title")).toBe("Me");
  });

  it("keeps a stored URL string as a preview row with a remove button", () => {
    setup(
      <FileInput source="avatar">
        <FilePreviewChild />
      </FileInput>,
      { defaultValues: { avatar: "https://example.org/me.png" } },
    );
    const removeButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(removeButtons).toHaveLength(1);
    const [remove] = removeButtons;
    if (!remove) throw new Error("expected a remove button");
    fireEvent.click(remove);
    expect(screen.queryAllByRole("button", { name: /delete/i })).toHaveLength(
      0,
    );
  });

  it("renders a remove button per file and removes on click", () => {
    setup(
      <FileInput source="attachments" multiple>
        <FilePreviewChild />
      </FileInput>,
      {
        defaultValues: {
          attachments: [
            { src: "https://example.org/a.pdf", title: "Cover" },
            { src: "https://example.org/b.png", title: "Plan" },
          ],
        },
      },
    );
    const removeButtons = screen.getAllByRole("button", { name: /delete/i });
    expect(removeButtons).toHaveLength(2);
    const [firstRemove] = removeButtons;
    if (!firstRemove) throw new Error("expected a remove button");
    // Remove the first file (Cover) → only Plan remains.
    fireEvent.click(firstRemove);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    const [remainingLink] = links;
    if (!remainingLink) throw new Error("expected 1 link");
    expect(remainingLink.getAttribute("title")).toBe("Plan");
  });

  it("accepts a dropped file and shows its preview", async () => {
    setup(
      <FileInput source="avatar">
        <FilePreviewChild />
      </FileInput>,
      { defaultValues: { avatar: null } },
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const file = new File(["hello"], "hello.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    // react-dropzone reads dropped files asynchronously (file-selector Promise);
    // await the state flush before asserting the preview.
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(1));
    const links = screen.getAllByRole("link");
    const [firstLink] = links;
    if (!firstLink) throw new Error("expected 1 link");
    // transformFile sets title to the dropped file's name.
    expect(firstLink.getAttribute("title")).toBe("hello.png");
  });

  it("surfaces a validation error via <ValidationError> after submit", async () => {
    const { submitRef } = setup<{ attachments: unknown[] | null }>(
      <FileInput source="attachments" multiple validate={required()}>
        <FilePreviewChild />
      </FileInput>,
      { defaultValues: { attachments: null } },
    );
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => {
      await submitRef.current?.();
    });
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-slot")).toBe("field-error");
    expect(alert.textContent).toContain("Required");
  });
});
