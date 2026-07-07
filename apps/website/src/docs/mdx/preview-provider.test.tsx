/**
 * The live-preview end-to-end gate.
 *
 * Mounts the representative quickstart demos under `<PreviewProvider>` in jsdom
 * and asserts that REAL `@chelone/react` components render against the fixture
 * provider. This proves the whole runtime chain the docs pipeline depends on:
 * the `@/`-alias + package resolution, the admin provider stack, and the
 * MemoryRouter-hosted `<Resource>` view mount — all resolving the ported
 * components at runtime (not just at build time).
 *
 * Plain DOM assertions (no jest-dom) so the website needs no extra matcher dep.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BooleanFieldDemo from "../content/getting-started/quick-start-guide/demos/boolean-field";
import PostListDemo from "../content/getting-started/quick-start-guide/demos/post-list";
import ReferenceFieldDemo from "../content/getting-started/quick-start-guide/demos/reference-field";
import TextFieldDemo from "../content/getting-started/quick-start-guide/demos/text-field";
import TextInputDemo from "../content/getting-started/quick-start-guide/demos/text-input";
import { PreviewProvider } from "./preview-provider";

describe("PreviewProvider — live admin previews render against the fixture provider", () => {
  it("renders a <List><DataTable> with a seeded post row cell (view mode)", async () => {
    render(
      <PreviewProvider mode="view">
        <PostListDemo />
      </PreviewProvider>,
    );
    // The seeded first post's title — proves the whole list controller +
    // DataTable stack fetched from fakeDataProvider and rendered a real row.
    const cell = await screen.findByText("On Computable Numbers");
    expect(cell).toBeTruthy();
  });

  it("renders a bare <TextField> showing the record value (record mode)", async () => {
    render(
      <PreviewProvider mode="record">
        <TextFieldDemo />
      </PreviewProvider>,
    );
    expect(await screen.findByText("On Computable Numbers")).toBeTruthy();
  });

  it("renders a <ReferenceField> resolving the author name (record mode)", async () => {
    render(
      <PreviewProvider mode="record">
        <ReferenceFieldDemo />
      </PreviewProvider>,
    );
    // author_id=1 → "Ada Lovelace" — proves the reference query resolves.
    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
  });

  it("renders a <BooleanField> for the record (record mode)", async () => {
    const { container } = render(
      <PreviewProvider mode="record">
        <BooleanFieldDemo />
      </PreviewProvider>,
    );
    // The first seeded post is published:true → the field renders an svg icon.
    await waitFor(() => {
      expect(container.querySelector("svg")).toBeTruthy();
    });
  });

  it("renders a <TextInput> with its label (input mode)", async () => {
    render(
      <PreviewProvider mode="input">
        <TextInputDemo />
      </PreviewProvider>,
    );
    // The input binds to `title`; its label + control render inside the form.
    expect(await screen.findByLabelText(/title/i)).toBeTruthy();
  });
});
