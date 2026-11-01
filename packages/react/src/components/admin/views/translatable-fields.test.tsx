/**
 * `<TranslatableFields>` shows one field in several locales, one tab per
 * locale: a child `<TextField source="title" />` reads `title.en` in one tab
 * and `title.fr` in the next. Mounted under the providers a show view gives
 * and asserted through DOM and roles.
 */
import {
  createI18n,
  createResourceRegistry,
  defineMessages,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../../../context";
import { useListContext } from "../../../form";
import { RecordContextProvider } from "../../../record/record-context";
import {
  ResourceContextProvider,
  ResourceRegistryProvider,
} from "../../../resource";
import { RouterAdapterProvider } from "../../../router/adapter";
import { reactRouterAdapter } from "../../../router/react-router-adapter";
import { ArrayField } from "../fields/array-field";
import { TextField } from "../fields/text-field";
import { Show } from "./show";
import { TranslatableFields } from "./translatable-fields";

const post = {
  id: 1,
  title: { en: "Hello", fr: "Bonjour" },
  body: { en: "World", fr: "Monde" },
};

function makeI18n(messages: Record<string, string> = {}) {
  return createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
}

/** Mount `ui` under a resource and, unless `record` is null, a record. */
function mount(
  ui: ReactNode,
  {
    record = post,
    resource = "posts",
    messages,
  }: {
    record?: Record<string, unknown> | null;
    resource?: string | null;
    messages?: Record<string, string>;
  } = {},
) {
  return render(
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={makeI18n(messages)}
    >
      <ResourceContextProvider value={resource ?? undefined}>
        <RecordContextProvider value={record ?? undefined}>
          {ui}
        </RecordContextProvider>
      </ResourceContextProvider>
    </CheloneProvider>,
  );
}

function panel(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no element with id ${id}`);
  return el;
}

/** Radix tabs activate on mouse down, not click. */
function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

afterEach(async () => {
  cleanup();
  await act(async () => {});
});

describe("TranslatableFields", () => {
  it("TranslatableFields shows the default locale's value and switches on a tab click", () => {
    mount(
      <TranslatableFields locales={["en", "fr"]}>
        <TextField source="title" />
      </TranslatableFields>,
    );
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "En",
      "Fr",
    ]);
    expect(panel("translatable-content-en").hidden).toBe(false);
    expect(
      within(panel("translatable-content-en")).getByText("Hello"),
    ).toBeTruthy();
    expect(panel("translatable-content-fr").hidden).toBe(true);
    expect(
      within(panel("translatable-content-fr")).getByText("Bonjour"),
    ).toBeTruthy();

    selectTab("Fr");

    expect(panel("translatable-content-en").hidden).toBe(true);
    expect(panel("translatable-content-fr").hidden).toBe(false);
    expect(
      panel("translatable-content-fr").getAttribute("aria-labelledby"),
    ).toBe("translatable-header-fr");
    expect(screen.getByRole("tab", { name: "Fr" }).id).toBe(
      "translatable-header-fr",
    );
  });
});
