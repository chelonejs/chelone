/**
 * The live-preview end-to-end gate.
 *
 * Mounts the representative quickstart demos under `<PreviewProvider>` and
 * asserts that REAL `@chelone/react` components render against the fixture
 * provider. This proves the whole runtime chain the docs pipeline depends on:
 * the `@/`-alias + package resolution, the admin provider stack, and the
 * resource/record contexts — all resolving the ported components at runtime
 * (not just at build time).
 *
 * CRITICAL: every render is wrapped in a `<MemoryRouter>` — the AMBIENT HOST
 * ROUTER the docs site (a react-router SPA) always supplies around a `/docs`
 * page. An earlier version of this test mounted `<PreviewProvider>` with NO
 * ambient router, which made it structurally blind to the site's real failure
 * mode: PreviewProvider nesting its own `<Router>` inside the site's router
 * ("You cannot render a <Router> inside another <Router>"). Mounting inside a
 * host router here reproduces the site's environment, so the test actually
 * exercises the router-nesting path that hydration hits.
 *
 * Plain DOM assertions (no jest-dom) so the website needs no extra matcher dep.
 */
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import InputsOverviewDemo from "../content/editing/demos/inputs-overview";
import BooleanFieldDemo from "../content/getting-started/quick-start-guide/demos/boolean-field";
import PostListDemo from "../content/getting-started/quick-start-guide/demos/post-list";
import ReferenceFieldDemo from "../content/getting-started/quick-start-guide/demos/reference-field";
import TextFieldDemo from "../content/getting-started/quick-start-guide/demos/text-field";
import TextInputDemo from "../content/getting-started/quick-start-guide/demos/text-input";
// P7g3 page-components + overview demos.
import CreateBasicDemo from "../content/page-components/create/demos/basic";
import EditBasicDemo from "../content/page-components/edit/demos/basic";
import ListBasicDemo from "../content/page-components/list/demos/basic";
import ShowBasicDemo from "../content/page-components/show/demos/basic";
import FieldsOverviewDemo from "../content/viewing/demos/fields-overview";
import { PreviewProvider } from "./preview-provider";

// Mount inside a `<MemoryRouter>` at a docs-like path — mirrors the site, where
// PreviewProvider always renders inside the SPA's host router.
function renderInHostRouter(ui: ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/docs/getting-started/quick-start-guide"]}>
      {ui}
    </MemoryRouter>,
  );
}

describe("PreviewProvider — live admin previews render against the fixture provider", () => {
  it("does NOT nest a router inside the host router (no <Router> in <Router> crash)", () => {
    // The exact failure the site hits on hydration surfaces as a thrown
    // "You cannot render a <Router> inside another <Router>". Assert the render
    // completes without throwing AND without React logging that error.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderInHostRouter(
        <PreviewProvider mode="view">
          <PostListDemo />
        </PreviewProvider>,
      ),
    ).not.toThrow();
    const nestedRouterError = errorSpy.mock.calls.find((c) =>
      String(c[0]).includes("cannot render a <Router> inside another <Router>"),
    );
    expect(nestedRouterError).toBeUndefined();
    errorSpy.mockRestore();
  });

  it("renders a <List><DataTable> with a seeded post row cell (view mode)", async () => {
    renderInHostRouter(
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
    renderInHostRouter(
      <PreviewProvider mode="record">
        <TextFieldDemo />
      </PreviewProvider>,
    );
    expect(await screen.findByText("On Computable Numbers")).toBeTruthy();
  });

  it("renders a <ReferenceField> resolving the author name (record mode)", async () => {
    renderInHostRouter(
      <PreviewProvider mode="record">
        <ReferenceFieldDemo />
      </PreviewProvider>,
    );
    // author_id=1 → "Ada Lovelace" — proves the reference query resolves.
    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
  });

  it("renders a <BooleanField> for the record (record mode)", async () => {
    const { container } = renderInHostRouter(
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
    renderInHostRouter(
      <PreviewProvider mode="input">
        <TextInputDemo />
      </PreviewProvider>,
    );
    // The input binds to `title`; its label + control render inside the form.
    expect(await screen.findByLabelText(/title/i)).toBeTruthy();
  });

  // ── P7g3 page-components + overview demos ──────────────────────────────────

  it("renders the page-components <List> demo (view mode)", async () => {
    renderInHostRouter(
      <PreviewProvider mode="view">
        <ListBasicDemo />
      </PreviewProvider>,
    );
    expect(await screen.findByText("On Computable Numbers")).toBeTruthy();
  });

  it("renders the page-components <Edit> demo for id=1 (view mode)", async () => {
    renderInHostRouter(
      <PreviewProvider mode="view">
        <EditBasicDemo />
      </PreviewProvider>,
    );
    // The fetched record hydrates the title input.
    const input = (await screen.findByLabelText(/title/i)) as HTMLInputElement;
    expect(input.value).toBe("On Computable Numbers");
  });

  it("renders the page-components <Create> demo (view mode)", async () => {
    renderInHostRouter(
      <PreviewProvider mode="view">
        <CreateBasicDemo />
      </PreviewProvider>,
    );
    // A fresh create form renders an empty title input + a Save button.
    expect(await screen.findByLabelText(/title/i)).toBeTruthy();
  });

  it("renders the page-components <Show> demo for id=1 (view mode)", async () => {
    renderInHostRouter(
      <PreviewProvider mode="view">
        <ShowBasicDemo />
      </PreviewProvider>,
    );
    // RecordField rows render the fetched record's values (also in the title).
    const hits = await screen.findAllByText("On Computable Numbers");
    expect(hits.length).toBeGreaterThan(0);
  });

  it("renders the Fields overview demo (record mode)", async () => {
    renderInHostRouter(
      <PreviewProvider mode="record">
        <FieldsOverviewDemo />
      </PreviewProvider>,
    );
    // The resolved author reference proves the whole field stack renders.
    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
  });

  it("renders the Inputs overview demo (input mode)", async () => {
    renderInHostRouter(
      <PreviewProvider mode="input">
        <InputsOverviewDemo />
      </PreviewProvider>,
    );
    expect(await screen.findByLabelText(/title/i)).toBeTruthy();
  });
});
