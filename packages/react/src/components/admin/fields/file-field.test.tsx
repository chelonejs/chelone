/**
 * P7d-T3 — `<FileField>` ported onto chelone `useFieldValue` + `useTranslate`.
 *
 * Renders a downloadable file link (or a `<ul>` of links for an array of file
 * records) from the ambient record. No reference resolution — pure record read.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("an array item's title and src read a bracket path", () => {
    render(
      <Providers>
        <RecordContextProvider
          value={{
            id: 1,
            files: [
              { meta: [{ name: "Plan" }], links: [{ href: "plan.pdf" }] },
              { meta: [{ name: "Cover" }], links: [{ href: "cover.pdf" }] },
            ],
          }}
        >
          <FileField source="files" src="links[0].href" title="meta[0].name" />
        </RecordContextProvider>
      </Providers>,
    );
    expect(
      screen.getByRole("link", { name: "Plan" }).getAttribute("href"),
    ).toBe("plan.pdf");
    expect(
      screen.getByRole("link", { name: "Cover" }).getAttribute("href"),
    ).toBe("cover.pdf");
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

  it("renders a numeric title path as text", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, url: "doc.pdf", version: 7 }}>
          <FileField source="url" title="version" />
        </RecordContextProvider>
      </Providers>,
    );
    const link = screen.getByRole("link", { name: "7" });
    expect(link.getAttribute("title")).toBe("7");
    expect(link.getAttribute("href")).toBe("doc.pdf");
  });

  it("renders numeric array item titles as text", () => {
    render(
      <Providers>
        <RecordContextProvider
          value={{
            id: 1,
            files: [
              { src: "a.pdf", size: 12 },
              { src: "b.pdf", size: 34 },
            ],
          }}
        >
          <FileField source="files" src="src" title="size" />
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByRole("link", { name: "12" }).getAttribute("href")).toBe(
      "a.pdf",
    );
    expect(screen.getByRole("link", { name: "34" }).getAttribute("href")).toBe(
      "b.pdf",
    );
  });

  it("leaves the href off an array item whose src path misses", () => {
    const { container } = render(
      <Providers>
        <RecordContextProvider
          value={{
            id: 1,
            files: [{ src: "a.pdf", name: "A" }, { name: "B" }],
          }}
        >
          <FileField source="files" src="src" />
        </RecordContextProvider>
      </Providers>,
    );
    const links = Array.from(container.querySelectorAll("a"));
    expect(links).toHaveLength(2);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["a.pdf", null]);
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

  it("a javascript: URL renders no href, for one file and for an array", () => {
    const alertSpy = vi.fn();
    const originalAlert = window.alert;
    window.alert = alertSpy;
    const { container } = render(
      <Providers>
        <RecordContextProvider
          value={{ id: 1, url: "javascript:alert(1)", title: "Report" }}
        >
          <FileField source="url" title="title" />
        </RecordContextProvider>
        <RecordContextProvider
          value={{
            id: 2,
            files: [{ src: "JavaScript:alert(2)", title: "Plan" }],
          }}
        >
          <FileField source="files" src="src" title="title" />
        </RecordContextProvider>
      </Providers>,
    );
    try {
      // the title text still shows
      expect(screen.getByText("Report")).toBeTruthy();
      expect(screen.getByText("Plan")).toBeTruthy();

      const links = Array.from(container.querySelectorAll("a"));
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link.getAttribute("href")).toBeNull();
        expect(link.href).not.toContain("javascript:");
        fireEvent.click(link);
      }
      expect(alertSpy).not.toHaveBeenCalled();
    } finally {
      window.alert = originalAlert;
    }
  });

  it("a blob: preview URL keeps its link", () => {
    const { container } = render(
      <Providers>
        <RecordContextProvider
          value={{
            id: 1,
            url: "blob:https://example.com/0b1c",
            title: "Stored file",
          }}
        >
          <FileField source="url" title="title" />
        </RecordContextProvider>
        <RecordContextProvider
          value={{
            id: 2,
            files: [{ src: "blob:jsdom/preview", title: "a.pdf" }],
          }}
        >
          <FileField source="files" src="src" title="title" />
        </RecordContextProvider>
      </Providers>,
    );
    expect(
      Array.from(container.querySelectorAll("a")).map((a) =>
        a.getAttribute("href"),
      ),
    ).toEqual(["blob:https://example.com/0b1c", "blob:jsdom/preview"]);
  });
});
