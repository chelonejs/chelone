/**
 * P7a-T2: `useGetResourceLabel()` — returns `(resource, count?) => string`
 * (parity: ra-core `useGetResourceLabel`). Resolves
 * `resources.${resource}.name` with pluralization, falling back to a humanized,
 * count-inflected default when the key is missing.
 *
 * Chelone divergence from ra-core (documented): ra-core leans on polyglot's `_`
 * default-value param; chelone `translate` returns the KEY when a message is
 * missing and pluralizes on `count` (not `smart_count`). So this hook
 * implements the default-value fallback itself (translate → if it echoes the
 * key, use the humanized fallback) and passes BOTH `count` (chelone plural
 * selection) and `smart_count` (ra-core-catalog compat).
 */

import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
  type MessageCatalog,
  type ResourceRegistry,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { CheloneProvider } from "../context";
import { ResourceRegistryProvider } from "../resource";
import { useGetResourceLabel } from "./use-get-resource-label";

interface WrapperOpts {
  messages?: Record<string, MessageCatalog>;
  registry?: ResourceRegistry;
}

function makeWrapper(opts: WrapperOpts = {}) {
  const registry = opts.registry ?? createResourceRegistry();
  const i18n = createI18n({
    locale: "en",
    messages: opts.messages ?? {
      en: defineMessages({}),
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <ResourceRegistryProvider registry={registry}>
        {children}
      </ResourceRegistryProvider>
    </CheloneProvider>
  );
}

describe("useGetResourceLabel", () => {
  it("translates the resources.<resource>.name key", () => {
    const wrapper = makeWrapper({
      messages: {
        en: defineMessages({ "resources.posts.name": "Article" }),
      },
    });
    const { result } = renderHook(() => useGetResourceLabel(), { wrapper });
    expect(result.current("posts")).toBe("Article");
  });

  it("pluralizes via the catalog's plural message on count", () => {
    const wrapper = makeWrapper({
      messages: {
        en: defineMessages({
          "resources.posts.name": { one: "Article", other: "Articles" },
        }),
      },
    });
    const { result } = renderHook(() => useGetResourceLabel(), { wrapper });
    expect(result.current("posts", 1)).toBe("Article");
    expect(result.current("posts", 2)).toBe("Articles");
  });

  it("falls back to a humanized, count-inflected default when the key is missing", () => {
    const wrapper = makeWrapper(); // empty catalog
    const { result } = renderHook(() => useGetResourceLabel(), { wrapper });
    // default count is 2 → plural
    expect(result.current("posts")).toBe("Posts");
    expect(result.current("posts", 1)).toBe("Post");
    expect(result.current("user_profiles", 2)).toBe("User profiles");
    expect(result.current("user_profiles", 1)).toBe("User profile");
  });

  it("uses the resource definition's options.label as the default when present", () => {
    const registry = createResourceRegistry();
    registry.register({
      name: "posts",
      hasList: true,
      hasCreate: false,
      hasEdit: false,
      hasShow: false,
      options: { label: "Blog entries" },
    });
    const wrapper = makeWrapper({ registry }); // empty catalog
    const { result } = renderHook(() => useGetResourceLabel(), { wrapper });
    // options.label wins over the humanized default when the name key is missing
    expect(result.current("posts", 2)).toBe("Blog entries");
  });

  it("returns a stable callback identity across re-renders", () => {
    const wrapper = makeWrapper();
    const { result, rerender } = renderHook(() => useGetResourceLabel(), {
      wrapper,
    });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
