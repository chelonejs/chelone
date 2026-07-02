import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "./context";
import { createCheloneHooks, useGetList, useGetOne, useUpdate } from "./hooks";

const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
});
type R = typeof resources;

function makeWrapper() {
  const dataProvider = fakeDataProvider<R>({
    posts: [
      { id: 1, title: "a" },
      { id: 2, title: "b" },
    ],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CheloneProvider dataProvider={dataProvider} queryClient={queryClient}>
      {children}
    </CheloneProvider>
  );
  return { wrapper, queryClient };
}

describe("react hooks", () => {
  it("useGetList resolves typed data through the provider", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetList<R, "posts">("posts"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data.map((p) => p.title)).toEqual(["a", "b"]);
  });

  it("useGetOne is served from the list-seeded cache shape", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useGetOne<R, "posts">("posts", { id: 1 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("a");
  });

  it("useUpdate mutates and the list refetches (invalidation)", async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => ({
        list: useGetList<R, "posts">("posts"),
        update: useUpdate<R, "posts">("posts"),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));
    result.current.update.mutate({ id: 1, data: { title: "a2" } });
    await waitFor(() =>
      expect(
        result.current.list.data?.data.find((p) => p.id === 1)?.title,
      ).toBe("a2"),
    );
  });

  it("createCheloneHooks binds the registry type — data infers, bad names reject", async () => {
    const hooks = createCheloneHooks<R>();
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => hooks.useGetList("posts"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expectTypeOf(result.current.data?.data).toEqualTypeOf<
      { id: number; title: string }[] | undefined
    >();
    // @ts-expect-error unknown resource name rejected by the bound hooks
    void (() => hooks.useGetList("nope"));
  });

  it("useCheloneContext throws a clear error outside the provider", () => {
    expect(() => renderHook(() => useGetList("posts"))).toThrow(
      /CheloneProvider/,
    );
  });
});
