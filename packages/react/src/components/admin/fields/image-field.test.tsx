/**
 * P7d-T3 — `<ImageField>` ported onto chelone `useFieldValue` + `useTranslate`.
 *
 * Renders an `<img>` (or a `<ul>` of images for an array) from the ambient
 * record. No reference resolution — pure record read.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ImageField } from "./image-field";

function Providers({ children }: { children: ReactNode }) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
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

describe("<ImageField>", () => {
  it("renders a single image from the source value", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, url: "avatar.png" }}>
          <ImageField source="url" />
        </RecordContextProvider>
      </Providers>,
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("avatar.png");
  });

  it("uses a literal title string for the title and alt attributes", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, url: "avatar.png" }}>
          <ImageField source="url" title="User Avatar" />
        </RecordContextProvider>
      </Providers>,
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("title")).toBe("User Avatar");
    expect(img.getAttribute("alt")).toBe("User Avatar");
  });

  it("renders the empty node when the value is null", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <ImageField source="url" empty={<span>no avatar</span>} />
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByText("no avatar")).toBeTruthy();
  });

  it("renders multiple images when the value is an array", () => {
    render(
      <Providers>
        <RecordContextProvider
          value={{
            id: 1,
            pics: [
              { src: "a.png", title: "A" },
              { src: "b.png", title: "B" },
              { src: "c.png", title: "C" },
            ],
          }}
        >
          <ImageField source="pics" src="src" title="title" />
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getAllByRole("img").length).toBe(3);
  });

  it("an array item's title and src read a bracket path", () => {
    render(
      <Providers>
        <RecordContextProvider
          value={{
            id: 1,
            pics: [
              { meta: [{ name: "A" }], links: [{ href: "a.png" }] },
              { meta: [{ name: "B" }], links: [{ href: "b.png" }] },
            ],
          }}
        >
          <ImageField source="pics" src="links[0].href" title="meta[0].name" />
        </RecordContextProvider>
      </Providers>,
    );
    const imgs = screen.getAllByRole("img");
    expect(imgs.map((img) => img.getAttribute("src"))).toEqual([
      "a.png",
      "b.png",
    ]);
    expect(imgs.map((img) => img.getAttribute("title"))).toEqual(["A", "B"]);
  });

  it("renders nothing when the value is null and no empty prop", () => {
    const { container } = render(
      <Providers>
        <RecordContextProvider value={{ id: 1 }}>
          <ImageField source="url" />
        </RecordContextProvider>
      </Providers>,
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("omits title/alt when no title prop is given (no whole-record leak)", () => {
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, url: "avatar.png" }}>
          <ImageField source="url" />
        </RecordContextProvider>
      </Providers>,
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("title")).toBeNull();
    expect(img.getAttribute("alt")).toBeNull();
  });
});
