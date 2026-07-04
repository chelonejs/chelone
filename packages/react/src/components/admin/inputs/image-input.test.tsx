/**
 * P7c-T3 — `<ImageInput>` ported onto chelone. It is a thin wrapper around
 * `<FileInput>` that defaults `accept` to images and renders an inline `<img>`
 * thumbnail preview (reading each file's per-file `RecordContext`) when no child
 * is supplied. jsdom applies no CSS: assert DOM/roles/values and behavior — the
 * file <input>, the humanized label, the default `<img>` thumbnails, an explicit
 * child override, and helper text — never visual styling.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { CheloneFormProvider } from "../../../form-context";
import { useForm } from "../../../form-hooks";
import { useRecordContext } from "../../../record/record-context";
import { ImageInput } from "./image-input";

function makeWrapper() {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
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

function setup(
  ui: ReactNode,
  { defaultValues }: { defaultValues?: Record<string, unknown> } = {},
) {
  const Wrapper = makeWrapper();
  function FormHost({ children }: { children: ReactNode }) {
    const form = useForm({ defaultValues, save: async () => undefined });
    return (
      <CheloneFormProvider form={form.form} submit={form.submit}>
        {children}
      </CheloneFormProvider>
    );
  }
  return render(
    <Wrapper>
      <FormHost>{ui}</FormHost>
    </Wrapper>,
  );
}

afterEach(() => cleanup());

describe("<ImageInput>", () => {
  it("renders a file input with the humanized field label", () => {
    setup(<ImageInput source="pictures" multiple />, {
      defaultValues: { pictures: [] },
    });
    const input = document.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(screen.getByText("Pictures")).not.toBeNull();
  });

  it("renders an <img> thumbnail per existing file (default preview)", () => {
    setup(<ImageInput source="pictures" multiple />, {
      defaultValues: {
        pictures: [
          { src: "https://example.org/1.png", title: "One" },
          { src: "https://example.org/2.png", title: "Two" },
        ],
      },
    });
    const imgs = Array.from(
      document.querySelectorAll("img"),
    ) as HTMLImageElement[];
    expect(imgs).toHaveLength(2);
    expect(imgs[0].getAttribute("src")).toBe("https://example.org/1.png");
    expect(imgs[0].getAttribute("title")).toBe("One");
    expect(imgs[0].getAttribute("alt")).toBe("One");
  });

  it("passes an explicit child through instead of the default thumbnail", () => {
    function CustomChild() {
      const r = useRecordContext<{ src?: string; title?: string }>();
      return <span data-testid="custom">{r?.title}</span>;
    }
    setup(
      <ImageInput source="pictures" multiple>
        <CustomChild />
      </ImageInput>,
      {
        defaultValues: {
          pictures: [{ src: "https://example.org/1.png", title: "One" }],
        },
      },
    );
    // No default <img>, the custom child is used instead.
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByTestId("custom").textContent).toBe("One");
  });

  it("uses an explicit label when provided", () => {
    setup(<ImageInput source="pictures" label="Product photos" />, {
      defaultValues: { pictures: [] },
    });
    expect(screen.getByText("Product photos")).not.toBeNull();
  });

  it("renders helper text when provided", () => {
    setup(
      <ImageInput source="pictures" helperText="JPG or PNG, up to 5MB each" />,
      { defaultValues: { pictures: [] } },
    );
    expect(screen.getByText(/jpg or png, up to 5mb each/i)).not.toBeNull();
  });
});
