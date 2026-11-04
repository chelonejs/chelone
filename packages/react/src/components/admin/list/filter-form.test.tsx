/**
 * P7e-T1 — `<FilterForm>` ported onto chelone `FilterLiveForm` + the list
 * filter slice. Renders the currently-shown filter inputs (alwaysOn, or
 * displayed, or holding a value) and wires them to the ambient list's filter.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import {
  createElement,
  type FC,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { ListContextProvider, type ListContextValue } from "../../../form";
import { ResourceContextProvider } from "../../../resource";
import { useList } from "../../../use-list";
import { TextInput } from "../inputs/text-input";
import { FilterForm } from "./filter-form";

afterEach(cleanup);

function Providers({ children }: { children: ReactNode }) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages({}) },
  });
  return (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      {children}
    </CheloneProvider>
  );
}

/**
 * Build a filter input element carrying the filter-only props (`alwaysOn`,
 * `defaultValue`) FilterForm reads off `element.props`. Chelone inputs don't
 * declare `alwaysOn` (it is a filter-layer concern, not an input concern), so we
 * inject it through a loosely-typed props object — exactly how FilterForm reads
 * it back (via a `FilterElementProps` cast).
 */
function filterInput(
  source: string,
  extra: { alwaysOn?: boolean; defaultValue?: unknown } = {},
): ReactElement {
  // TextInput doesn't declare `alwaysOn` (a filter-layer prop), so widen the
  // component to a loose functional-component type to attach it.
  const LooseInput = TextInput as unknown as FC<Record<string, unknown>>;
  return createElement(LooseInput, { key: source, source, ...extra });
}

function Harness({
  children,
  filter = {},
  displayedFilters = {},
}: {
  children: ReactNode;
  filter?: Record<string, unknown>;
  displayedFilters?: Record<string, boolean>;
}) {
  return (
    <Providers>
      <ResourceContextProvider value="posts">
        <Inner filter={filter} displayedFilters={displayedFilters}>
          {children}
        </Inner>
      </ResourceContextProvider>
    </Providers>
  );
}

function Inner({
  children,
  filter,
  displayedFilters,
}: {
  children: ReactNode;
  filter: Record<string, unknown>;
  displayedFilters: Record<string, boolean>;
}) {
  const list = useList({ data: [], filter });
  const value = {
    ...list,
    filter,
    displayedFilters,
  } as unknown as ListContextValue;
  return <ListContextProvider value={value}>{children}</ListContextProvider>;
}

describe("<FilterForm>", () => {
  it("renders an alwaysOn filter input", () => {
    render(
      <Harness>
        <FilterForm filters={[filterInput("q", { alwaysOn: true })]} />
      </Harness>,
    );
    // The always-on input is present (query by its source name attribute).
    expect(document.querySelector("input[name='q']")).toBeTruthy();
  });

  it("hides an optional filter that is neither displayed nor valued", () => {
    render(
      <Harness>
        <FilterForm filters={[filterInput("title")]} />
      </Harness>,
    );
    expect(document.querySelector("input[name='title']")).toBeNull();
  });

  it("shows an optional filter once it is in displayedFilters", () => {
    render(
      <Harness displayedFilters={{ title: true }}>
        <FilterForm filters={[filterInput("title")]} />
      </Harness>,
    );
    expect(document.querySelector("input[name='title']")).toBeTruthy();
  });

  it("shows an optional filter that already holds a value", () => {
    render(
      <Harness filter={{ title: "hello" }}>
        <FilterForm filters={[filterInput("title")]} />
      </Harness>,
    );
    expect(document.querySelector("input[name='title']")).toBeTruthy();
  });

  it("a filter with a nested source shows as set when the list filter holds a value at that path", () => {
    render(
      <Harness filter={{ tags: [{ label: "news" }] }}>
        <FilterForm filters={[filterInput("tags[0].label")]} />
      </Harness>,
    );
    expect(document.querySelector("input[name='tags[0].label']")).toBeTruthy();
  });

  it("renders a remove control for a non-alwaysOn shown filter", () => {
    render(
      <Harness displayedFilters={{ title: true }}>
        <FilterForm filters={[filterInput("title")]} />
      </Harness>,
    );
    // A hide/remove button is rendered next to the optional filter.
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
