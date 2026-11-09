import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it } from "vitest";
import { FrameworkCode } from "./framework-code";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/** The shape rehype-pretty-code leaves behind: a `<figure>` whose `<pre>` names the language. */
function Fences() {
  return (
    <FrameworkCode>
      <figure data-rehype-pretty-code-figure="">
        <pre data-language="tsx">{'<TextField source="title" />'}</pre>
      </figure>
      <figure data-rehype-pretty-code-figure="">
        <pre data-language="vue">{'<posts.TextInput source="title" />'}</pre>
      </figure>
    </FrameworkCode>
  );
}

function renderFences(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Fences />
    </MemoryRouter>,
  );
}

it("shows the React fence by default", () => {
  renderFences("/docs/type-safety/overview");

  expect(screen.getByText('<TextField source="title" />')).toBeTruthy();
  expect(screen.queryByText('<posts.TextInput source="title" />')).toBeNull();
  expect(
    screen.getByRole("button", { name: "React" }).getAttribute("aria-pressed"),
  ).toBe("true");
});

it("shows the Vue fence at ?framework=vue", () => {
  renderFences("/docs/type-safety/overview?framework=vue");

  expect(screen.getByText('<posts.TextInput source="title" />')).toBeTruthy();
  expect(screen.queryByText('<TextField source="title" />')).toBeNull();
  expect(
    screen.getByRole("button", { name: "Vue" }).getAttribute("aria-pressed"),
  ).toBe("true");
});

it("the buttons move the block between the two fences", () => {
  renderFences("/docs/type-safety/overview");

  fireEvent.click(screen.getByRole("button", { name: "Vue" }));
  expect(screen.getByText('<posts.TextInput source="title" />')).toBeTruthy();
  expect(screen.queryByText('<TextField source="title" />')).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "React" }));
  expect(screen.getByText('<TextField source="title" />')).toBeTruthy();
});

it("a block with only one framework's fence shows no switch", () => {
  render(
    <MemoryRouter initialEntries={["/docs/type-safety/overview"]}>
      <FrameworkCode>
        <figure data-rehype-pretty-code-figure="">
          <pre data-language="tsx">
            {"const resources = defineResources({})"}
          </pre>
        </figure>
      </FrameworkCode>
    </MemoryRouter>,
  );

  expect(
    screen.getByText("const resources = defineResources({})"),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Vue" })).toBeNull();
  expect(screen.queryByRole("button", { name: "React" })).toBeNull();
});
