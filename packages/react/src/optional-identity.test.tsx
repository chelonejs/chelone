import {
  type AuthProvider,
  defineResources,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useGetIdentity, useOptionalIdentity } from "./auth-hooks";
import { CheloneProvider } from "./context";

afterEach(cleanup);

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});

const baseAuth = (over: Partial<AuthProvider> = {}): AuthProvider => ({
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  ...over,
});

function makeWrapper(authProvider?: AuthProvider) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider<typeof resources>({ posts: [] })}
      queryClient={queryClient}
      authProvider={authProvider}
    >
      {children}
    </CheloneProvider>
  );
  return { wrapper, queryClient };
}

describe("useOptionalIdentity", () => {
  it("useOptionalIdentity returns the identity from the auth provider", async () => {
    const authProvider = baseAuth({
      getIdentity: async () => ({ id: 7, fullName: "Rin" }),
    });
    const { wrapper } = makeWrapper(authProvider);
    const { result } = renderHook(() => useOptionalIdentity(), { wrapper });
    expect(result.current.isPending).toBe(true);
    await waitFor(() =>
      expect(result.current.identity).toMatchObject({ id: 7, fullName: "Rin" }),
    );
    expect(result.current.isPending).toBe(false);
  });

  it("useOptionalIdentity returns undefined and runs no query without an auth provider", () => {
    const { wrapper, queryClient } = makeWrapper();
    const { result } = renderHook(() => useOptionalIdentity(), { wrapper });
    expect(result.current).toEqual({ identity: undefined, isPending: false });
    expect(queryClient.isFetching()).toBe(0);
    expect(
      queryClient.getQueryCache().find({ queryKey: ["auth", "getIdentity"] })
        ?.state.fetchStatus ?? "idle",
    ).toBe("idle");
    expect(queryClient.getQueryData(["auth", "getIdentity"])).toBeUndefined();
  });

  it("useOptionalIdentity returns undefined when the provider has no getIdentity", () => {
    const { wrapper, queryClient } = makeWrapper(baseAuth());
    const { result } = renderHook(() => useOptionalIdentity(), { wrapper });
    expect(result.current).toEqual({ identity: undefined, isPending: false });
    expect(queryClient.isFetching()).toBe(0);
  });

  it("useOptionalIdentity settles as undefined when getIdentity rejects", async () => {
    const getIdentity = vi.fn().mockRejectedValue(new Error("down"));
    const { wrapper } = makeWrapper(baseAuth({ getIdentity }));
    const { result } = renderHook(() => useOptionalIdentity(), { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(getIdentity).toHaveBeenCalled();
    expect(result.current.identity).toBeUndefined();
  });

  it("useOptionalIdentity and useGetIdentity share one getIdentity call", async () => {
    const getIdentity = vi.fn(async () => ({ id: 1, fullName: "Rin" }));
    const { wrapper } = makeWrapper(baseAuth({ getIdentity }));
    const { result } = renderHook(
      () => ({ optional: useOptionalIdentity(), plain: useGetIdentity() }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.optional.identity).toBeDefined();
      expect(result.current.plain.data).toBeDefined();
    });
    expect(getIdentity).toHaveBeenCalledTimes(1);
  });
});
