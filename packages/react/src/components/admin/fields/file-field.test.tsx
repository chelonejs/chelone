/**
 * P7d-T3 — `<FileField>` ported onto chelone `useFieldValue` + `useTranslate`.
 *
 * Renders a downloadable file link (or a `<ul>` of links for an array of file
 * records) from the ambient record. No reference resolution — pure record read.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { FileField } from "./file-field";

function Providers({ children }: { children: ReactNode }) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "No file": "No file" }) },
  });
  const dataProvider = fakeDataProvider({});
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

afterEach(cleanup);

describe("<FileField>", () => {
  it("renders a single file url as a link using the title", () => {
    render(
      <Providers>
        <RecordContextProvider
          value={{ id: 1, url: "doc.pdf", title: "Presentation" }}
        >
          <FileField source="url" title="title" />
        </RecordContextProvider>
      </Providers>,
    );
    const link = screen.getByRole("link", { name: "Presentation" });
    expect(link.getAttribute("href")).toBe("doc.pdf");
  });

  it("falls back to a literal title string when the title is not a record path", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, url: "doc.pdf" }}>
          <FileField source="url" title="Download" />
        </RecordContextProvider>
      </Providers>,
    );
    const link = screen.getByRole("link", { name: "Download" });
    expect(link.getAttribute("href")).toBe("doc.pdf");
  });

  it("renders an array of files as a list of links", () => {
    render(
      <Providers>
        <RecordContextProvider
          value={{
            id: 1,
            files: [
              { src: "https://example.org/document.pdf", title: "Cover image" },
              { src: "https://example.org/picture.png", title: "Project plan" },
            ],
          }}
        >
          <FileField source="files" src="src" title="title" />
        </RecordContextProvider>
      </Providers>,
    );
    expect(
      screen.getByRole("link", { name: "Cover image" }).getAttribute("href"),
    ).toBe("https://example.org/document.pdf");
    expect(
      screen.getByRole("link", { name: "Project plan" }).getAttribute("href"),
    ).toBe("https://example.org/picture.png");
  });

  it("renders nothing when the value is null and no empty prop", () => {
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <FileField source="url" />
        </RecordContextProvider>
      </Providers>,
    );
    expect(container.querySelector("a")).toBeNull();
  });

  it("renders a translated empty node when the value is null and empty is set", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <FileField source="url" empty="No file" />
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByText("No file")).toBeTruthy();
  });

  it("omits title and avoids a whole-record leak when no title prop is given", () => {
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1, url: "doc.pdf" }}>
          <FileField source="url" />
        </RecordContextProvider>
      </Providers>,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("doc.pdf");
    // No title prop → no title attribute and no "[object Object]" whole-record leak.
    expect(link?.getAttribute("title")).toBeNull();
    expect(link?.textContent ?? "").not.toContain("[object Object]");
  });
});
