/**
 * P7d-T3 — `<ReferenceOneField>` ported onto chelone data hooks.
 *
 * Resolves a single related record from a one-to-one relationship: the record
 * of `reference` whose `target` field equals the current record's id, published
 * in a `RecordContext` for the child field (or a render prop). Rebridge note:
 * chelone has no `ReferenceOneFieldBase`; the field composes `useGetList`
 * (`{ [target]: id }` filter, `perPage: 1`) + `RecordContextProvider`.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceRegistryProvider } from "../../../resource";
import { ReferenceOneField } from "./reference-one-field";
import { TextField } from "./text-field";

const bios = [
  { id: 1, author_id: 1, body: "Irish novelist, short story writer." },
  { id: 2, author_id: 2, body: "American essayist." },
];

function makeProviders() {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({ "No bio": "No bio" }) },
  });
  const dataProvider = fakeDataProvider({
    bios: structuredClone(bios),
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
  return Providers;
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
            render={(bio) => <span>{(bio as { body?: string })?.body}</span>}
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
});
