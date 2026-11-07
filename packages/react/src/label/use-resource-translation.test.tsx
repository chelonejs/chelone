/**
 * P7a-T2: `useResourceTranslation({ resourceI18nKey?, baseI18nKey, userText?,
 * options? })` — resolve a resource-scoped label with a global fallback
 * (parity: ra-core `useResourceTranslation`). Precedence:
 * - `userText` set: a non-string ReactNode → verbatim; a string → translated
 *   with itself as default;
 * - no `resourceI18nKey` → translate `baseI18nKey`;
 * - otherwise translate `resourceI18nKey`, defaulting to `baseI18nKey`.
 *
 * Chelone divergence (documented): ra-core threads a polyglot `_` default;
 * chelone `translate` echoes the KEY when missing. So this hook implements the
 * fallback explicitly — a `resourceI18nKey` that echoes (missing) falls through
 * to `baseI18nKey`, matching `resolveNotificationKey`'s convention.
 */

import {
  createI18n,
  defineMessages,
  fakeDataProvider,
  type MessageCatalog,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { CheloneProvider } from "../context";
import { useResourceTranslation } from "./use-resource-translation";

function makeWrapper(messages?: Record<string, MessageCatalog>) {
  const i18n = createI18n({
    locale: "en",
    messages: messages ?? { en: defineMessages({}) },
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

describe("useResourceTranslation", () => {
  it("returns a non-string userText (ReactNode) verbatim", () => {
    const node = <span>Custom</span>;
    const { result } = renderHook(
      () =>
        useResourceTranslation({
          baseI18nKey: "chelone.action.delete",
          userText: node,
        }),
      { wrapper: makeWrapper() },
    );
    expect(result.current).toBe(node);
  });

  it("translates a string userText, defaulting to itself", () => {
    const { result } = renderHook(
      () =>
        useResourceTranslation({
          baseI18nKey: "chelone.action.delete",
          userText: "My Label",
        }),
      { wrapper: makeWrapper() },
    );
    expect(result.current).toBe("My Label");
  });

  it("keeps a string userText when options carry another fallback", () => {
    const { result } = renderHook(
      () =>
        useResourceTranslation({
          baseI18nKey: "chelone.action.update",
          userText: "Mark champion",
          options: { _: "Update" },
        }),
      { wrapper: makeWrapper() },
    );
    expect(result.current).toBe("Mark champion");
  });

  it("translates baseI18nKey when no resourceI18nKey is given", () => {
    const { result } = renderHook(
      () => useResourceTranslation({ baseI18nKey: "chelone.action.delete" }),
      {
        wrapper: makeWrapper({
          en: defineMessages({ "chelone.action.delete": "Delete" }),
        }),
      },
    );
    expect(result.current).toBe("Delete");
  });

  it("prefers the resourceI18nKey translation when present", () => {
    const { result } = renderHook(
      () =>
        useResourceTranslation({
          resourceI18nKey: "resources.posts.action.delete",
          baseI18nKey: "chelone.action.delete",
        }),
      {
        wrapper: makeWrapper({
          en: defineMessages({
            "resources.posts.action.delete": "Remove article",
            "chelone.action.delete": "Delete",
          }),
        }),
      },
    );
    expect(result.current).toBe("Remove article");
  });

  it("falls back to baseI18nKey when the resourceI18nKey is missing", () => {
    const { result } = renderHook(
      () =>
        useResourceTranslation({
          resourceI18nKey: "resources.posts.action.delete",
          baseI18nKey: "chelone.action.delete",
        }),
      {
        wrapper: makeWrapper({
          en: defineMessages({ "chelone.action.delete": "Delete" }),
        }),
      },
    );
    expect(result.current).toBe("Delete");
  });

  it("interpolates options into the translated message", () => {
    const { result } = renderHook(
      () =>
        useResourceTranslation({
          baseI18nKey: "chelone.action.delete_name",
          options: { name: "post" },
        }),
      {
        wrapper: makeWrapper({
          en: defineMessages({
            "chelone.action.delete_name": "Delete {name}",
          }),
        }),
      },
    );
    expect(result.current).toBe("Delete post");
  });
});
