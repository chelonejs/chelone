/**
 * P7e-T1 — `<FilterForm>` ported onto chelone `FilterLiveForm` + the list
 * filter slice. Renders the currently-shown filter inputs (alwaysOn, or
 * displayed, or holding a value) and wires them to the ambient list's filter.
 */
import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import {
  type ComponentProps,
  createElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { afterEach, describe, expect, it } from "vitest";
import { makeListContext } from "../../../__fixtures__/list-context";
import { CheloneProvider } from "../../../context";
import { ListContextProvider } from "../../../form";
import { ResourceContextProvider } from "../../../resource";
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
 * A `<TextInput>` that also takes `alwaysOn` and drops it: `alwaysOn` is the
 * filter layer's own prop, which FilterForm reads off `element.props` (via a
 * `FilterElementProps` cast) and never passes down to the input.
 */
type FilterInputProps = ComponentProps<typeof TextInput> & {
  alwaysOn?: boolean;
};

function FilterInput({ alwaysOn: _alwaysOn, ...inputProps }: FilterInputProps) {
  return <TextInput {...inputProps} />;
}

/** A filter input element carrying the filter-only props FilterForm reads. */
function filterInput(
  source: string,
  extra: { alwaysOn?: boolean } = {},
): ReactElement {
  return createElement(FilterInput, { key: source, source, ...extra });
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
  const value = makeListContext({ filter, displayedFilters });
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
