/**
 * P7d-T3 — `<ReferenceOneField>` ported onto chelone data hooks.
 *
 * Resolves a single related record from a one-to-one relationship: the record
 * of `reference` whose `target` field equals the current record's id, published
 * in a `RecordContext` for the child field (or a render prop). Rebridge note:
 * chelone has no `ReferenceOneFieldBase`; the field composes
 * `useReferenceOneFieldController` (one `getManyReference` row) +
 * `RecordContextProvider`.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceRegistryProvider } from "../../../resource";
import { ReferenceOneField } from "./reference-one-field";
import { TextField } from "./text-field";

const bios = [
  { id: 1, author_id: 1, body: "Irish novelist, short story writer." },
  { id: 2, author_id: 2, body: "American essayist." },
];

const seeded = [
  ...bios,
  { id: 3, author_id: 3, kind: "short", body: "First of two." },
  { id: 4, author_id: 3, kind: "long", body: "Second of two." },
];

function makeHarness() {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "No bio": "No bio" }) },
  });
  const dataProvider = fakeDataProvider({
    bios: structuredClone(seeded),
    authors: [],
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const registry = createResourceRegistry();
  registry.register({
    name: "bios",
    hasList: true,
    hasCreate: false,
    hasEdit: false,
    hasShow: false,
  });
  function Providers({ children }: { children: ReactNode }) {
    return (
      <CheloneProvider
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={i18n}
      >
        <ResourceRegistryProvider registry={registry}>
          {children}
        </ResourceRegistryProvider>
      </CheloneProvider>
    );
  }
  return { Providers, dataProvider };
}

function makeProviders() {
  return makeHarness().Providers;
}

/**
 * The `render` prop hands over a `LooseRecord`, so reading `body` off it needs a
 * check rather than a cast: a missing or non-string `body` fails at this line.
 */
function bodyOf(bio: LooseRecord | undefined): string {
  const body = bio?.body;
  if (typeof body !== "string") throw new Error("Expected a string bio.body");
  return body;
}

afterEach(cleanup);

describe("<ReferenceOneField>", () => {
  it("renders the related record's field once loaded", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceOneField reference="bios" target="author_id">
            <TextField source="body" />
          </ReferenceOneField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(
        screen.getByText(/Irish novelist, short story writer/i),
      ).toBeTruthy();
    });
  });

  it("invokes the render prop with the referenced record", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 2, name: "John" }}>
          <ReferenceOneField
            reference="bios"
            target="author_id"
            render={(bio) => <span>{bodyOf(bio)}</span>}
          />
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("American essayist.")).toBeTruthy();
    });
  });

  it("renders the empty node when no related record exists", async () => {
    const Providers = makeProviders();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 99, name: "Nobody" }}>
          <ReferenceOneField reference="bios" target="author_id" empty="No bio">
            <TextField source="body" />
          </ReferenceOneField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("No bio")).toBeTruthy();
    });
  });
  it("calls getManyReference with the target, the record id and one row, and never getList", async () => {
    const { Providers, dataProvider } = makeHarness();
    const getManyReference = vi.spyOn(dataProvider, "getManyReference");
    const getList = vi.spyOn(dataProvider, "getList");
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceOneField reference="bios" target="author_id">
            <TextField source="body" />
          </ReferenceOneField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Irish novelist/i)).toBeTruthy();
    });
    expect(getManyReference).toHaveBeenCalledTimes(1);
    expect(getManyReference).toHaveBeenCalledWith(
      "bios",
      expect.objectContaining({
        target: "author_id",
        id: 1,
        pagination: { page: 1, perPage: 1 },
      }),
    );
    expect(getList).not.toHaveBeenCalled();
  });

  it("the sort prop chooses which related record shows", async () => {
    const { Providers } = makeHarness();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 3, name: "Twice" }}>
          <ReferenceOneField
            reference="bios"
            target="author_id"
            sort={{ field: "id", order: "DESC" }}
          >
            <TextField source="body" />
          </ReferenceOneField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Second of two.")).toBeTruthy();
    });
    expect(screen.queryByText("First of two.")).toBeNull();
  });

  it("the filter prop narrows the lookup", async () => {
    const { Providers } = makeHarness();
    render(
      <Providers>
        <RecordContextProvider value={{ id: 3, name: "Twice" }}>
          <ReferenceOneField
            reference="bios"
            target="author_id"
            filter={{ kind: "long" }}
          >
            <TextField source="body" />
          </ReferenceOneField>
        </RecordContextProvider>
      </Providers>,
    );
    await waitFor(() => {
      expect(screen.getByText("Second of two.")).toBeTruthy();
    });
    expect(screen.queryByText("First of two.")).toBeNull();
  });

  it("renders the loading node while pending and the error node when the lookup rejects", async () => {
    const { Providers, dataProvider } = makeHarness();
    let reject: (reason: Error) => void = () => {};
    vi.spyOn(dataProvider, "getManyReference").mockImplementationOnce(
      () =>
        new Promise((_, rej) => {
          reject = rej;
        }),
    );
    render(
      <Providers>
        <RecordContextProvider value={{ id: 1, name: "Jane" }}>
          <ReferenceOneField
            reference="bios"
            target="author_id"
            loading="Loading bio"
            error="Bio failed"
            empty="No bio"
          >
            <TextField source="body" />
          </ReferenceOneField>
        </RecordContextProvider>
      </Providers>,
    );
    expect(screen.getByText("Loading bio")).toBeTruthy();
    await act(async () => {
      reject(new Error("boom"));
    });
    await waitFor(() => {
      expect(screen.getByText("Bio failed")).toBeTruthy();
    });
    expect(screen.queryByText("Loading bio")).toBeNull();
    expect(screen.queryByText("No bio")).toBeNull();
  });

  it("follows a record whose id changes", async () => {
    const { Providers } = makeHarness();
    const tree = (id: number) => (
      <Providers>
        <RecordContextProvider value={{ id, name: "Someone" }}>
          <ReferenceOneField reference="bios" target="author_id">
            <TextField source="body" />
          </ReferenceOneField>
        </RecordContextProvider>
      </Providers>
    );
    const { rerender } = render(tree(1));
    await waitFor(() => {
      expect(screen.getByText(/Irish novelist/i)).toBeTruthy();
    });
    rerender(tree(2));
    await waitFor(() => {
      expect(screen.getByText("American essayist.")).toBeTruthy();
    });
    expect(screen.queryByText(/Irish novelist/i)).toBeNull();
  });
});
