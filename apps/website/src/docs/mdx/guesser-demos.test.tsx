import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it } from "vitest";
import EditDemo from "../content/page-components/edit-guesser/demos/basic";
import ListDemo from "../content/page-components/list-guesser/demos/basic";
import ShowDemo from "../content/page-components/show-guesser/demos/basic";
import { PreviewProvider } from "./preview-provider";

afterEach(cleanup);

function mount(demo: ReactNode) {
  render(
    <MemoryRouter initialEntries={["/docs/preview"]}>
      <PreviewProvider>{demo}</PreviewProvider>
    </MemoryRouter>,
  );
}

// The guessers build from the `posts` schema the previews register.
it("ListGuesser builds a column for each field of the posts schema", async () => {
  mount(<ListDemo />);
  await screen.findByText("On Computable Numbers");
  for (const name of ["Title", "Body", "Author", "Views", "Published"]) {
    expect(screen.getByRole("columnheader", { name })).toBeTruthy();
  }
});

it("ShowGuesser builds a row for each field of the posts schema", async () => {
  mount(<ShowDemo />);
  await screen.findByText("Views");
  for (const label of ["Title", "Body", "Author", "Views", "Published"]) {
    expect(screen.getByText(label)).toBeTruthy();
  }
});

it("EditGuesser builds an input for each field of the posts schema", async () => {
  mount(<EditDemo />);
  const title = await screen.findByRole("textbox", { name: "Title" });
  expect(title).toHaveProperty("value", "On Computable Numbers");
  expect(screen.getByRole("spinbutton", { name: "Views" })).toBeTruthy();
});
