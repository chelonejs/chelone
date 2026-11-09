/**
 * `<UrlField>`, `<FileField>` and `<ImageField>` fed a hostile stored value.
 * Each test mounts a `<Show>` route under `<Admin>`, so the record comes from
 * the data provider as it does on a real show page, and pins that no live
 * `javascript:` link, `src` or element reaches the DOM.
 */

import {
  createI18n,
  createNotificationStore,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import {
  Admin,
  FileField,
  ImageField,
  Resource,
  Show,
  UrlField,
} from "../../../index";

afterEach(cleanup);

const HOSTILE = "javascript:alert(1)";
const IFRAME = '<iframe src="javascript:alert(1)"></iframe>';

function mountShow(value: string, field: ReactNode) {
  const { container } = render(
    <MemoryRouter initialEntries={["/posts/1/show"]}>
      <Admin
        notifications={createNotificationStore()}
        i18n={createI18n({
          locale: "en",
          messages: { en: defineMessages({}) },
        })}
        dataProvider={fakeDataProvider({ posts: [{ id: 1, link: value }] })}
        queryClient={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <Resource
          name="posts"
          show={() => <Show title={false}>{field}</Show>}
        />
      </Admin>
    </MemoryRouter>,
  );
  return container;
}

describe("link fields given a hostile value", () => {
  it("UrlField renders a javascript: url as text with no anchor", async () => {
    const container = mountShow(HOSTILE, <UrlField source="link" />);
    const text = await screen.findByText(HOSTILE);
    expect(text.tagName).toBe("SPAN");
    expect(container.querySelector("a")).toBeNull();
  });

  it("UrlField renders an iframe string as text and mounts no iframe", async () => {
    const container = mountShow(IFRAME, <UrlField source="link" />);
    await screen.findByText(IFRAME);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  it("FileField keeps its anchor with no href", async () => {
    const container = mountShow(
      HOSTILE,
      <FileField source="link" title="Report" />,
    );
    const link = await screen.findByText("Report");
    expect(link.tagName).toBe("A");
    expect(link.hasAttribute("href")).toBe(false);
    expect(container.querySelector("[href]")).toBeNull();
  });

  it("ImageField keeps its img with no src", async () => {
    const container = mountShow(
      HOSTILE,
      <ImageField source="link" title="Cover" />,
    );
    const image = await screen.findByAltText("Cover");
    expect(image.tagName).toBe("IMG");
    expect(image.hasAttribute("src")).toBe(false);
    expect(container.querySelector("[src]")).toBeNull();
  });
});
