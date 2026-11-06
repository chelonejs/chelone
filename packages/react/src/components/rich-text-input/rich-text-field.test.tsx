import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../context";
import { RecordContextProvider } from "../../record/record-context";
import { RichTextField } from "./rich-text-field";

afterEach(cleanup);

function wrap(record: LooseRecord) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "myapp.empty": "no content" }) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <RecordContextProvider value={record}>{children}</RecordContextProvider>
    </CheloneProvider>
  );
}

const HOSTILE = [
  "<img src=x onerror=alert(1)>",
  "<script>alert(1)</script>",
  '<iframe src="javascript:alert(1)"></iframe>',
  '<a href="javascript:alert(1)">x</a>',
  "<style>body{display:none}</style>",
  '<p style="position:fixed">x</p>',
].join("");

describe("<RichTextField>", () => {
  it("renders the HTML from the record source", () => {
    const { container } = render(<RichTextField source="body" />, {
      wrapper: wrap({ id: 1, body: "<h1>Title</h1><p>Hello <b>world</b></p>" }),
    });
    const root = container.querySelector('[data-slot="rich-text-field"]');
    expect(root?.tagName).toBe("DIV");
    expect(root?.classList.contains("rich-text")).toBe(true);
    expect(root?.querySelector("h1")?.textContent).toBe("Title");
    expect(root?.querySelector("p b")?.textContent).toBe("world");
  });

  it("renders a translated empty string when the value is missing", () => {
    const { container, getByText } = render(
      <RichTextField source="body" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1 }) },
    );
    expect(getByText("no content")).toBeTruthy();
    expect(container.querySelector('[data-slot="rich-text-field"]')).toBeNull();
  });

  it("renders an empty string value as the empty prop", () => {
    const { getByText } = render(
      <RichTextField source="body" empty="myapp.empty" />,
      { wrapper: wrap({ id: 1, body: "" }) },
    );
    expect(getByText("no content")).toBeTruthy();
  });

  it("renders an empty element in place of the HTML when the value is missing", () => {
    const { getByTestId, container } = render(
      <RichTextField source="body" empty={<em data-testid="none">none</em>} />,
      { wrapper: wrap({ id: 1, body: null }) },
    );
    expect(getByTestId("none").tagName).toBe("EM");
    expect(container.querySelector('[data-slot="rich-text-field"]')).toBeNull();
  });

  it("renders an empty element when the value is missing and there is no empty prop", () => {
    const { container } = render(<RichTextField source="body" />, {
      wrapper: wrap({ id: 1 }),
    });
    const root = container.querySelector('[data-slot="rich-text-field"]');
    expect(root?.tagName).toBe("DIV");
    expect(root?.innerHTML).toBe("");
  });

  it("renders a non-string value through String()", () => {
    const { container } = render(<RichTextField source="body" />, {
      wrapper: wrap({ id: 1, body: 42 }),
    });
    expect(container.textContent).toBe("42");
  });

  it("stripTags renders the text with no elements", () => {
    const { container } = render(<RichTextField source="body" stripTags />, {
      wrapper: wrap({ id: 1, body: "<h1>Title</h1><p>Hello <b>world</b></p>" }),
    });
    const root = container.querySelector('[data-slot="rich-text-field"]');
    expect(root?.textContent).toBe("TitleHello world");
    expect(root?.children.length).toBe(0);
  });

  it("renders hostile HTML without running it", () => {
    const { container } = render(<RichTextField source="body" />, {
      wrapper: wrap({ id: 1, body: HOSTILE }),
    });
    expect(container.querySelector("script, iframe, style")).toBeNull();
    for (const el of container.querySelectorAll("*")) {
      expect(el.getAttributeNames().filter((n) => n.startsWith("on"))).toEqual(
        [],
      );
      expect(el.hasAttribute("style")).toBe(false);
      expect(el.getAttribute("href") ?? "").not.toMatch(/^\s*javascript:/i);
    }
    // The harmless parts survive.
    expect(container.querySelector("a")?.textContent).toBe("x");
  });

  it("stripTags shows hostile markup as text", () => {
    const { container } = render(<RichTextField source="body" stripTags />, {
      wrapper: wrap({
        id: 1,
        body: "<p>safe</p>&lt;img src=x onerror=alert(1)&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
      }),
    });
    expect(container.querySelector("img, script")).toBeNull();
    expect(container.textContent).toBe(
      "safe<img src=x onerror=alert(1)><script>alert(1)</script>",
    );
  });

  it("stripTags drops hostile elements", () => {
    const { container } = render(<RichTextField source="body" stripTags />, {
      wrapper: wrap({ id: 1, body: HOSTILE }),
    });
    expect(container.querySelector("img, script, iframe, style, a")).toBeNull();
    expect(container.textContent).toBe("xx");
  });
});
