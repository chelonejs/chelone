import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  CreateContextProvider,
  type CreateContextValue,
  EditContextProvider,
  type EditContextValue,
  ShowContextProvider,
  type ShowContextValue,
  useCreateContext,
  useEditContext,
  useShowContext,
} from "./record-view-context";
import {
  SaveContextProvider,
  type SaveContextValue,
  useSaveContext,
} from "./save-context";

interface Post {
  id: number;
  title: string;
}

const record: Post = { id: 1, title: "hello" };

const noopSave = async () => undefined;

describe("useEditContext", () => {
  it("returns the ra-shaped edit context published by the provider", () => {
    const value: EditContextValue<Post> = {
      record,
      isPending: false,
      isFetching: false,
      error: null,
      saving: false,
      save: noopSave,
      mutationMode: "pessimistic",
      resource: "posts",
      defaultTitle: "Post hello",
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <EditContextProvider value={value}>{children}</EditContextProvider>
    );
    const { result } = renderHook(() => useEditContext<Post>(), { wrapper });
    expect(result.current.record).toEqual(record);
    expect(result.current.saving).toBe(false);
    expect(result.current.mutationMode).toBe("pessimistic");
    expect(result.current.defaultTitle).toBe("Post hello");
    expect(result.current.resource).toBe("posts");
    expect(result.current.save).toBe(noopSave);
  });

  it("throws when used outside an EditContextProvider", () => {
    expect(() => renderHook(() => useEditContext())).toThrow(
      /EditContextProvider/,
    );
  });
});

describe("useShowContext", () => {
  it("returns the ra-shaped show context published by the provider", () => {
    const value: ShowContextValue<Post> = {
      record,
      isPending: false,
      isFetching: false,
      error: null,
      resource: "posts",
      defaultTitle: "Post hello",
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ShowContextProvider value={value}>{children}</ShowContextProvider>
    );
    const { result } = renderHook(() => useShowContext<Post>(), { wrapper });
    expect(result.current.record).toEqual(record);
    expect(result.current.isPending).toBe(false);
    expect(result.current.resource).toBe("posts");
    expect(result.current.defaultTitle).toBe("Post hello");
    // Show has no save — it is not a SaveContextValue.
    expect("save" in result.current).toBe(false);
  });

  it("throws when used outside a ShowContextProvider", () => {
    expect(() => renderHook(() => useShowContext())).toThrow(
      /ShowContextProvider/,
    );
  });
});

describe("useCreateContext", () => {
  it("returns the ra-shaped create context published by the provider", () => {
    const value: CreateContextValue<Post> = {
      record: { title: "seed" },
      isPending: false,
      saving: false,
      save: noopSave,
      mutationMode: "pessimistic",
      resource: "posts",
      defaultTitle: "Create Post",
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CreateContextProvider value={value}>{children}</CreateContextProvider>
    );
    const { result } = renderHook(() => useCreateContext<Post>(), { wrapper });
    expect(result.current.record).toEqual({ title: "seed" });
    expect(result.current.saving).toBe(false);
    expect(result.current.save).toBe(noopSave);
    expect(result.current.defaultTitle).toBe("Create Post");
    expect(result.current.resource).toBe("posts");
  });

  it("throws when used outside a CreateContextProvider", () => {
    expect(() => renderHook(() => useCreateContext())).toThrow(
      /CreateContextProvider/,
    );
  });
});

describe("useSaveContext", () => {
  it("returns the empty object default when no provider is present (ra parity, non-throwing)", () => {
    const { result } = renderHook(() => useSaveContext());
    expect(result.current).toEqual({});
    // save-button reads `saveContext?.save` — an undefined save must be safe.
    expect(result.current.save).toBeUndefined();
  });

  it("exposes {save, saving, mutationMode} published by the provider", () => {
    const value: SaveContextValue = {
      save: noopSave,
      saving: true,
      mutationMode: "optimistic",
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SaveContextProvider value={value}>{children}</SaveContextProvider>
    );
    const { result } = renderHook(() => useSaveContext(), { wrapper });
    expect(result.current.save).toBe(noopSave);
    expect(result.current.saving).toBe(true);
    expect(result.current.mutationMode).toBe("optimistic");
  });
});

describe("edit/create contexts satisfy the SaveContext contract", () => {
  it("an EditContextValue is assignable where a SaveContextValue is expected", () => {
    // Structural check: an edit context, provided to a SaveContextProvider,
    // yields a working useSaveContext (views publish edit result into both).
    const edit: EditContextValue<Post> = {
      record,
      isPending: false,
      isFetching: false,
      error: null,
      saving: true,
      save: noopSave,
      mutationMode: "optimistic",
      resource: "posts",
    };
    const saveValue: SaveContextValue = edit;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SaveContextProvider value={saveValue}>{children}</SaveContextProvider>
    );
    const { result } = renderHook(() => useSaveContext(), { wrapper });
    expect(result.current.saving).toBe(true);
    expect(result.current.save).toBe(noopSave);
  });
});
