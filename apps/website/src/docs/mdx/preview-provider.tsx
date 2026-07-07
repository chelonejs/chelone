/**
 * PreviewProvider — the ambient admin context stack every live `<ComponentPreview>`
 * demo renders inside.
 *
 * A live preview mounts a bare `@chelone/react` component (a field, an input, or
 * a whole view) that expects the admin provider stack around it. This wraps each
 * demo in exactly that stack — the same one the reference app composes
 * (`<Admin>` over `fakeDataProvider`) — hosted in a `MemoryRouter` so the
 * preview never touches the page URL.
 *
 * How it works: the demo is mounted as the `posts` resource's LIST view, and the
 * router is pointed at `/posts`. `<Resource>` wraps that view in a
 * `ResourceContextProvider`, and `<Admin>` supplies the router adapter, resource
 * registry, data/query/i18n/store providers — everything a ported component
 * reads. (Rendering a bare child directly under `<Admin>` does NOT work:
 * `partitionChildren` ignores non-marker children, so the demo must live at a
 * route — the same reason the reference app puts its views under `<Resource>`.)
 *
 * Three `mode`s supply the extra inner context a demo needs, layered inside the
 * mounted list view:
 *   - `view`   (default): the demo IS the view (`<List>`/`<Edit>`/…), rendered
 *              as-is; it publishes its own record/list/form context.
 *   - `record`: wraps the demo in a `RecordContextProvider` for a bare read-only
 *              field (e.g. `<TextField source="title" />`).
 *   - `input`:  wraps the demo in a `<Create>` form context for a bare input
 *              (e.g. `<TextInput source="title" />`) that registers into a form.
 */
import { fakeDataProvider } from "@chelone/core";
import { Admin, Create, RecordContextProvider, Resource } from "@chelone/react";
import { QueryClient } from "@tanstack/react-query";
import { type ComponentType, type ReactNode, useMemo, useState } from "react";
import { MemoryRouter } from "react-router";
import {
  makePreviewI18n,
  makePreviewNotifications,
  makePreviewStore,
  previewRecord,
  previewResources,
  previewSeed,
} from "./preview-fixtures";

export type PreviewMode = "view" | "record" | "input";

interface PreviewProviderProps {
  mode?: PreviewMode;
  children: ReactNode;
}

// Placeholder for resource views the preview never navigates to.
function Noop() {
  return null;
}

export function PreviewProvider({
  mode = "view",
  children,
}: PreviewProviderProps) {
  // Per-mount services (module-scope would leak mutated seed data between
  // previews). useState initializer runs once per mount.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
          mutations: { retry: false },
        },
      }),
  );
  const [dataProvider] = useState(() => fakeDataProvider(previewSeed()));
  const [i18n] = useState(makePreviewI18n);
  const [notifications] = useState(makePreviewNotifications);
  const [store] = useState(makePreviewStore);

  // The demo, wrapped per mode, as a stable component mounted at the posts list
  // route. `record`/`input` layer their extra context here (inside the resource
  // context the mounted view already carries).
  const ListView = useMemo<ComponentType<unknown>>(() => {
    function PreviewListView() {
      if (mode === "record") {
        return (
          <RecordContextProvider value={previewRecord}>
            {children}
          </RecordContextProvider>
        );
      }
      if (mode === "input") {
        return <Create resource="posts">{children}</Create>;
      }
      return <>{children}</>;
    }
    return PreviewListView;
  }, [mode, children]);

  return (
    <MemoryRouter initialEntries={["/posts"]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={queryClient}
        i18n={i18n}
        notifications={notifications}
        store={store}
        resources={previewResources}
      >
        {/* The demo is mounted as the posts LIST (the router is at /posts).
            `authors` backs any ReferenceField/ReferenceInput in the demo. */}
        <Resource
          name="posts"
          list={ListView}
          edit={Noop}
          create={Noop}
          show={Noop}
        />
        <Resource name="authors" list={Noop} />
      </Admin>
    </MemoryRouter>
  );
}
