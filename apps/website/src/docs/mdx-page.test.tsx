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
  ["editing/webhook-endpoint-input", "WebhookEndpointInput"],
  ["ui-layout/can-access", "CanAccess"],
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

it("shows the Menu live preview with the preview resources on its reference page", async () => {
  render(
    <MemoryRouter initialEntries={["/docs/ui-layout/menu"]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole("link", { name: /Posts/ })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Authors/ })).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "preview" })).toHaveLength(1);
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

// The hook pages are hand-written MDX, so a bad JSX escape in their prose would
// fail the build rather than a props lookup. Rendering them catches it here.
it.each([
  ["use-subscribe", "useSubscribe"],
  ["use-subscribe-to-record", "useSubscribeToRecord"],
  ["use-subscribe-to-record-list", "useSubscribeToRecordList"],
  ["use-subscribe-callback", "useSubscribeCallback"],
  ["use-publish", "usePublish"],
  ["use-on-reconnect", "useOnReconnect"],
  ["use-realtime-status", "useRealtimeStatus"],
  ["use-get-list-live", "useGetListLive"],
  ["use-get-one-live", "useGetOneLive"],
  ["use-get-many-live", "useGetManyLive"],
  ["use-lock", "useLock"],
  ["use-unlock", "useUnlock"],
  ["use-get-lock", "useGetLock"],
  ["use-get-lock-live", "useGetLockLive"],
  ["use-get-locks", "useGetLocks"],
  ["use-get-locks-live", "useGetLocksLive"],
  ["use-lock-on-mount", "useLockOnMount"],
])(
  "renders the realtime %s page with its signature, returns and example",
  async (slug, title) => {
    render(
      <MemoryRouter initialEntries={[`/docs/realtime/${slug}`]}>
        <Routes>
          <Route path="/docs/*" element={<MdxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: title }),
    ).toBeTruthy();
    for (const heading of ["Signature", "Returns", "Example", "In Vue"]) {
      expect(
        screen.getByRole("heading", { level: 2, name: heading }),
        heading,
      ).toBeTruthy();
    }
    expect(screen.queryByRole("button", { name: "preview" })).toBeNull();
  },
);
