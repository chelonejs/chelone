import { Blob } from "node:buffer";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MdxPage from "./mdx-page";

// Shiki decompresses its bundled WASM through Blob.stream(), absent in jsdom.
beforeEach(() => vi.stubGlobal("Blob", Blob));
afterEach(() => {
  vi.unstubAllGlobals();
  // A test that picks Vue must not carry the choice to the next page.
  localStorage.clear();
});

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
  ["editing/wizard-form", "WizardForm"],
  ["maps/line-string-field", "LineStringField"],
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

// The inspector pages are hand-written MDX, so a bad JSX escape in their prose
// would fail the build rather than a props lookup. Rendering them catches it
// here, and the install block proves each `registry` frontmatter names a real
// registry item.
it.each([
  ["viewing/fields-selector", "FieldsSelector", true],
  ["ui-layout/inspector", "Inspector", true],
  ["editing/configurable-inputs", "ConfigurableInputs", true],
])(
  "renders the %s reference page with its install block and props table",
  async (slug, title, hasDemo) => {
    render(
      <MemoryRouter initialEntries={[`/docs/${slug}`]}>
        <Routes>
          <Route path="/docs/*" element={<MdxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: title }),
    ).toBeTruthy();
    expect(screen.getByText("Installation")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Props" }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("button", { name: "preview" })).toHaveLength(
      hasDemo ? 1 : 0,
    );
  },
);

// `page-components` pages do not show their `basic` demo on their own, so the
// csv-import page places its preview by hand.
it.each([["page-components/csv-import", "CsvImport"]])(
  "renders the %s reference page with its live preview",
  async (slug, title) => {
    render(
      <MemoryRouter initialEntries={[`/docs/${slug}`]}>
        <Routes>
          <Route path="/docs/*" element={<MdxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: title }),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "preview" })).toHaveLength(1);
  },
);

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

// The rich text pages are hand-written: a bad JSX escape in their prose or a
// missing props JSON would otherwise only surface at build time. Rendering them
// also pins the install block the add-on needs in both registries.
it.each([
  ["editing/rich-text-input", "RichTextInput", "toolbar"],
  ["viewing/rich-text-field", "RichTextField", "stripTags"],
])(
  "renders the %s page with its install block and props table",
  async (slug, title, prop) => {
    render(
      <MemoryRouter initialEntries={[`/docs/${slug}`]}>
        <Routes>
          <Route path="/docs/*" element={<MdxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: title }),
    ).toBeTruthy();
    expect(
      screen.getByText("pnpm dlx shadcn@latest add @chelone/rich-text-input"),
    ).toBeTruthy();
    // A page with a Vue demo has a second switch, in its preview. The install
    // block's comes first, and both follow the same choice.
    fireEvent.click(screen.getAllByRole("button", { name: "Vue" })[0]);
    expect(
      screen.getByText(
        "pnpm dlx shadcn-vue@latest add @chelone/rich-text-input",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 2, name: "Props" }),
    ).toBeTruthy();
    expect(screen.getByRole("cell", { name: prop })).toBeTruthy();
    // Each page ships a demos/basic.tsx, so it has a live preview.
    expect(screen.getByRole("button", { name: "preview" })).toBeTruthy();
  },
);

// Both block editor pages are hand-written MDX whose prose names components,
// and their install block comes from the page's registry frontmatter. Each has
// a `basic` demo, so the page opens on its live preview.
it.each([
  ["editing/block-editor-input", "BlockEditorInput"],
  ["viewing/block-doc-field", "BlockDocField"],
])(
  "renders the %s page with its block-editor install block",
  async (slug, title) => {
    render(
      <MemoryRouter initialEntries={[`/docs/${slug}`]}>
        <Routes>
          <Route path="/docs/*" element={<MdxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: title }),
    ).toBeTruthy();
    expect(
      screen.getByText("pnpm dlx shadcn@latest add @chelone/block-editor"),
    ).toBeTruthy();
    // One "Vue" button in the install block, one in the preview's switch.
    expect(screen.getAllByRole("button", { name: "Vue" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "preview" })).toBeTruthy();
  },
);

// The core function pages are hand-written MDX as well. They carry no "In Vue"
// heading: the function comes from @chelone/core and reads the same in both
// adapters.
it.each([
  ["add-events-for-mutations", "addEventsForMutations"],
  ["memory-transport", "memoryTransport"],
  ["broadcast-channel-transport", "broadcastChannelTransport"],
  ["websocket-transport", "webSocketTransport"],
  ["sse-transport", "sseTransport"],
  ["in-memory-lock-provider", "inMemoryLockProvider"],
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
    for (const heading of ["Signature", "Returns", "Example"]) {
      expect(
        screen.getByRole("heading", { level: 2, name: heading }),
        heading,
      ).toBeTruthy();
    }
    expect(
      screen.queryByRole("heading", { level: 2, name: "In Vue" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "preview" })).toBeNull();
  },
);

// The showcase photographs each of these pages and waits for the `see` in showcase.json, so
// a page that lists no preview fails CI's screenshot step.
it.each([
  ["supabase/supabase-login-page", "heading", "Sign in"],
  ["supabase/forgot-password-page", "heading", "Forgot your password?"],
  ["supabase/set-password-page", "button", "Save"],
  ["supabase/social-auth-button", "button", "Sign in with Github"],
] as const)(
  "shows the %s live preview on its reference page",
  async (slug, role, name) => {
    render(
      <MemoryRouter initialEntries={[`/docs/${slug}`]}>
        <Routes>
          <Route path="/docs/*" element={<MdxPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole(role, { name })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "preview" })).toHaveLength(1);
  },
);

it.each([
  ["edit-live", "Another user renames post 1"],
  ["list-live", "Another user adds a post"],
  ["lock-on-mount", "Grace opens post 1"],
  ["lock-status", "Another user locks post 1"],
  ["menu-live", "Another user adds a post"],
])("shows the live demo on the realtime %s page", async (slug, button) => {
  render(
    <MemoryRouter initialEntries={[`/docs/realtime/${slug}`]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByRole("button", { name: button })).toBeTruthy();
});

it("renders the h2 and h3 headings of a docs page as links to their own anchors", async () => {
  render(
    <MemoryRouter initialEntries={["/docs/app-config/supabase"]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  const authProvider = await screen.findByRole("heading", {
    level: 2,
    name: "Auth provider",
  });
  expect(authProvider.id).toBe("auth-provider");
  expect(
    within(authProvider)
      .getByRole("link", { name: "Auth provider" })
      .getAttribute("href"),
  ).toBe("#auth-provider");
  const oauth = screen.getByRole("heading", {
    level: 3,
    name: "OAuth sign-in",
  });
  expect(
    within(oauth)
      .getByRole("link", { name: "OAuth sign-in" })
      .getAttribute("href"),
  ).toBe(`#${oauth.id}`);
  // The page title is not part of the rail, so it stays plain.
  expect(
    within(screen.getByRole("heading", { level: 1 })).queryByRole("link"),
  ).toBeNull();
});

// The React section and the moved quick start guide: each page must still render
// at its new slug, with the demos it places by hand.
it.each([
  ["react/setup", "Setup"],
  ["react/quick-start-guide/setup", "1. Setup"],
  ["react/quick-start-guide/detail-editing", "3. Detail & Editing"],
  ["getting-started/install", "Installation"],
])("renders the %s guide page at its new slug", async (slug, title) => {
  render(
    <MemoryRouter initialEntries={[`/docs/${slug}`]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("heading", { level: 1, name: title }),
  ).toBeTruthy();
  expect(screen.queryByText(/Page not found/)).toBeNull();
});

it("renders the moved quick start list page with its four live demos", async () => {
  render(
    <MemoryRouter
      initialEntries={["/docs/react/quick-start-guide/building-the-list"]}
    >
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText("On Computable Numbers")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "preview" })).toHaveLength(4);
});

it("lands the React section on cards for its setup page and quick start", async () => {
  render(
    <MemoryRouter initialEntries={["/docs/react"]}>
      <Routes>
        <Route path="/docs/*" element={<MdxPage />} />
      </Routes>
    </MemoryRouter>,
  );

  expect(
    await screen.findByRole("heading", { level: 1, name: "React" }),
  ).toBeTruthy();
  const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
  expect(hrefs).toEqual(
    expect.arrayContaining([
      "/docs/react/setup",
      "/docs/react/quick-start-guide/setup",
    ]),
  );
});
