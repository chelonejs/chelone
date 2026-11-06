import { Blob } from "node:buffer";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MdxPage from "./mdx-page";

// Shiki decompresses its bundled WASM through Blob.stream(), absent in jsdom.
beforeEach(() => vi.stubGlobal("Blob", Blob));
afterEach(() => vi.unstubAllGlobals());

it("shows one live preview above the reference page body when a basic demo exists", async () => {
  render(
    <MemoryRouter initialEntries={["/docs/viewing/text-field"]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText("On Computable Numbers")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "preview" })).toHaveLength(1);
  const preview = screen.getByRole("button", { name: "preview" });
  const props = screen.getByRole("heading", { name: "Props" });
  expect(
    preview.compareDocumentPosition(props) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "code" }));
  await waitFor(() => {
    expect(
      screen
        .getAllByRole("code")
        .map((code) => code.textContent)
        .join("\n"),
    ).toContain('return <TextField source="title" />;');
  });
});

it("shows the BooleanField preview and its demo source", async () => {
  render(
    <MemoryRouter initialEntries={["/docs/viewing/boolean-field"]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getAllByRole("button", { name: "preview" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "code" }));
  await waitFor(() => {
    expect(
      screen
        .getAllByRole("code")
        .map((code) => code.textContent)
        .join("\n"),
    ).toContain('return <BooleanField source="published" />;');
  });
});

it.each([
  ["editing/text-input", "TextInput"],
  ["ui-layout/menu", "Menu"],
])("shows no preview on %s when no basic demo exists", (slug, title) => {
  render(
    <MemoryRouter initialEntries={[`/docs/${slug}`]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { level: 1, name: title })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "preview" })).toBeNull();
  expect(screen.queryByText(/Demo not found/)).toBeNull();
});

it("shows the AppBar live preview on its reference page", async () => {
  render(
    <MemoryRouter initialEntries={["/docs/ui-layout/app-bar"]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("button", { name: "Toggle Sidebar" }),
  ).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "preview" })).toHaveLength(1);
});

it("shows the AuthCallback loading state without a sign-in caption", async () => {
  render(
    <MemoryRouter initialEntries={["/docs/ui-layout/auth-callback"]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole("status", { name: "Loading" })).toBeTruthy();
  expect(screen.queryByText("Completing sign-in...")).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("keeps exactly one hand-placed preview on page-components/create", async () => {
  render(
    <MemoryRouter initialEntries={["/docs/page-components/create"]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByLabelText("Title")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "preview" })).toHaveLength(1);
});
