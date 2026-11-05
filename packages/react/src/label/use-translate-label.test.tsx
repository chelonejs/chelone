/**
 * P7a-T2: `useTranslateLabel()` — returns `({ source, label?, resource? }) =>
 * ReactNode` (parity: ra-core `useTranslateLabel`). Resolves a field label:
 * - `label === false` or `label === ""` → `null` (no label rendered);
 * - a non-string `label` (a ReactNode) → returned verbatim;
 * - otherwise translate `resources.${resource}.fields.${source}`, falling back
 *   to the humanized field name when the key is missing.
 *
 * Chelone divergence (documented): ra-core uses polyglot `_`; chelone
 * `translate` echoes the key when missing, so the humanized-field fallback is
 * applied here. The ambient `SourceContext.getLabel(source)` supplies the
 * default label key when no explicit `resource` is passed (ra-core's
 * `sourceContext?.getLabel`).
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
  type MessageCatalog,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { CheloneProvider } from "../context";
import { ResourceContextProvider, ResourceRegistryProvider } from "../resource";
import { useTranslateLabel } from "./use-translate-label";

interface WrapperOpts {
  messages?: Record<string, MessageCatalog>;
  resource?: string;
}

function makeWrapper(opts: WrapperOpts = {}) {
  const registry = createResourceRegistry();
  const i18n = createI18n({
    locale: "en",
    messages: opts.messages ?? { en: defineMessages({}) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        <ResourceContextProvider value={opts.resource}>
          {children}
        </ResourceContextProvider>
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("useTranslateLabel", () => {
  it("returns null when label is false", () => {
    const { result } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper(),
    });
    expect(result.current({ source: "title", label: false })).toBeNull();
  });

  it("returns null when label is an empty string", () => {
    const { result } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper(),
    });
    expect(result.current({ source: "title", label: "" })).toBeNull();
  });

  it("returns a non-string label (ReactNode) verbatim", () => {
    const node = <span>Custom</span>;
    const { result } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper(),
    });
    expect(result.current({ source: "title", label: node })).toBe(node);
  });

  it("translates an explicit string label (with itself as default)", () => {
    const { result } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper({
        messages: {
          en: defineMessages({ "my.custom.label": "Translated" }),
        },
      }),
    });
    expect(result.current({ source: "title", label: "my.custom.label" })).toBe(
      "Translated",
    );
  });

  it("returns the explicit string label verbatim when its key is missing", () => {
    const { result } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper(),
    });
    expect(result.current({ source: "title", label: "Plain Label" })).toBe(
      "Plain Label",
    );
  });

  it("translates the resources.<resource>.fields.<source> key", () => {
    const { result } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper({
        messages: {
          en: defineMessages({
            "resources.posts.fields.title": "Headline",
          }),
        },
      }),
    });
    expect(result.current({ source: "title", resource: "posts" })).toBe(
      "Headline",
    );
  });

  it("falls back to the humanized field name when the field key is missing", () => {
    const { result } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper(),
    });
    expect(result.current({ source: "firstName", resource: "posts" })).toBe(
      "First name",
    );
    // deep/dotted source → humanized suffix path
    expect(result.current({ source: "author.name", resource: "posts" })).toBe(
      "Author name",
    );
  });

  it("uses the ambient resource from context when no resource prop is passed", () => {
    const { result } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper({
        resource: "posts",
        messages: {
          en: defineMessages({
            "resources.posts.fields.title": "Ctx Headline",
          }),
        },
      }),
    });
    expect(result.current({ source: "title" })).toBe("Ctx Headline");
  });

  it("returns a stable callback identity across re-renders", () => {
    const { result, rerender } = renderHook(() => useTranslateLabel(), {
      wrapper: makeWrapper(),
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
