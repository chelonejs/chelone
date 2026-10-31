/**
 * `<Labeled>` tests: labels a plain field from its source, for layouts that
 * do not wrap each field in a `RecordField` (tabbed show, translatable fields).
 */

import { createI18n, defineMessages, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CheloneProvider } from "../../../context";
import { RecordContextProvider } from "../../../record/record-context";
import { ResourceContextProvider } from "../../../resource";
import { RecordField } from "../fields/record-field";
import { TextField } from "../fields/text-field";
import { Labeled } from "./labeled";

afterEach(cleanup);

function wrap(messages: Record<string, string> = {}) {
  const i18n = createI18n({
    locale: "en",
    messages: { en: defineMessages(messages) },
  });
  return ({ children }: { children: ReactNode }) => (
    <CheloneProvider
      dataProvider={fakeDataProvider({})}
      queryClient={new QueryClient()}
      i18n={i18n}
    >
      <ResourceContextProvider value="posts">
        <RecordContextProvider value={{ id: 1, title: "Hello World" }}>
          {children}
        </RecordContextProvider>
      </ResourceContextProvider>
    </CheloneProvider>
  );
}

describe("<Labeled>", () => {
  it("Labeled labels a field with the humanized source", () => {
    render(
      <Labeled>
        <TextField source="title" />
      </Labeled>,
      { wrapper: wrap() },
    );
    expect(screen.getByText("Title")).toBeTruthy();
    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  it("Labeled uses the translated resource field label when the resource has one", () => {
    render(
      <Labeled>
        <TextField source="title" />
      </Labeled>,
      { wrapper: wrap({ "resources.posts.fields.title": "Headline" }) },
    );
    expect(screen.getByText("Headline")).toBeTruthy();
    expect(screen.queryByText("Title")).toBeNull();
  });

  it("Labeled label prop overrides the child's label and source", () => {
    render(
      <Labeled label="Custom" source="id">
        <TextField source="title" label="Child label" />
      </Labeled>,
      { wrapper: wrap() },
    );
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.queryByText("Child label")).toBeNull();
    expect(screen.queryByText("Id")).toBeNull();
  });

  it("Labeled renders no label for label false, a native element, a Labeled child or a RecordField", () => {
    const { container } = render(
      <>
        <Labeled label={false}>
          <TextField source="title" />
        </Labeled>
        <Labeled>
          <TextField source="title" label={false} />
        </Labeled>
        <Labeled source="title">
          <span>native</span>
        </Labeled>
        <Labeled source="title">
          <Labeled label="Inner">
            <TextField source="title" />
          </Labeled>
        </Labeled>
        <Labeled source="title">
          <RecordField source="title" label="Own" />
        </Labeled>
      </>,
      { wrapper: wrap() },
    );
    expect(screen.queryByText("Title")).toBeNull();
    // Only the inner Labeled and the RecordField label themselves.
    expect(screen.getAllByText("Inner")).toHaveLength(1);
    expect(screen.getAllByText("Own")).toHaveLength(1);
    expect(container.textContent).not.toContain("Title");
  });

  it("Labeled shows a required marker when isRequired is set", () => {
    const { container } = render(
      <Labeled isRequired>
        <TextField source="title" />
      </Labeled>,
      { wrapper: wrap() },
    );
    expect(container.textContent).toContain("Title");
    expect(
      container.querySelector('[aria-hidden="true"]')?.textContent,
    ).toMatch(/\*/);
  });
});
