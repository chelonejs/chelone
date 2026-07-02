import {
  type AuthProvider,
  createI18n,
  createStore,
  defineMessages,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { useCanAccess, useGetIdentity } from "./auth-hooks";
import { CheloneProvider } from "./context";
import { useLocale, useSetLocale, useTranslate } from "./i18n-hooks";
import { useStoreItem } from "./store-hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number() }) },
});

function makeWrapper(extra: { authProvider?: AuthProvider } = {}) {
  const store = createStore();
  const i18n = createI18n({
    locale: "en",
    messages: {
      en: defineMessages({ "chelone.action.save": "Save" }),
      fr: defineMessages({ "chelone.action.save": "Enregistrer" }),
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider<typeof resources>({ posts: [] })}
      queryClient={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
      store={store}
      i18n={i18n}
      authProvider={extra.authProvider}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper, store, i18n };
}

describe("P3 react hooks", () => {
  it("useStoreItem reads, writes, and re-renders only on its key", () => {
    const { wrapper, store } = makeWrapper();
    const { result } = renderHook(
      () => useStoreItem<boolean>("sidebar.open", true),
      { wrapper },
    );
    expect(result.current[0]).toBe(true); // default
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(store.getItem("sidebar.open")).toBe(false);
  });

  it("useTranslate + useSetLocale switch reactively without remount", () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => ({
        t: useTranslate(),
        locale: useLocale(),
        setLocale: useSetLocale(),
      }),
      { wrapper },
    );
    expect(result.current.t("chelone.action.save")).toBe("Save");
    act(() => result.current.setLocale("fr"));
    expect(result.current.locale).toBe("fr");
    expect(result.current.t("chelone.action.save")).toBe("Enregistrer");
  });

  it("useGetIdentity and useCanAccess resolve through the authProvider", async () => {
    const authProvider: AuthProvider = {
      login: async () => {},
      logout: async () => {},
      checkAuth: async () => {},
      checkError: async () => {},
      getIdentity: async () => ({ id: 7, fullName: "Rin" }),
      canAccess: async ({ action }) => action === "read",
    };
    const { wrapper } = makeWrapper({ authProvider });
    const { result } = renderHook(
      () => ({
        identity: useGetIdentity(),
        canRead: useCanAccess({ action: "read", resource: "posts" }),
        canEdit: useCanAccess({ action: "edit", resource: "posts" }),
      }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.identity.data).toMatchObject({ id: 7 }),
    );
    await waitFor(() => expect(result.current.canRead.data).toBe(true));
    await waitFor(() => expect(result.current.canEdit.data).toBe(false));
  });

  it("hooks throw clear errors when their service is not provided", () => {
    const { wrapper } = makeWrapper(); // no authProvider
    expect(() => renderHook(() => useGetIdentity(), { wrapper })).toThrow(
      /authProvider/,
    );
  });
});
