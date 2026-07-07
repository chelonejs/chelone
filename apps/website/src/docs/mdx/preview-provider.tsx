/**
 * PreviewProvider — the ambient admin context stack every live `<ComponentPreview>`
 * demo renders inside.
 *
 * A live preview mounts a bare `@chelone/react` component (a field, an input, or
 * a whole view) that expects the admin provider stack around it. This wraps each
 * demo in exactly that stack — the same providers the reference app composes
 * (data / query / i18n / store / resource registry over `fakeDataProvider`).
 *
 * WHY `<AdminContext>` (the escape hatch) and NOT `<Admin>` + `<Resource>`:
 * the docs site is itself a react-router SPA, so every `/docs` page already
 * renders inside a host `<Router>`. Mounting `<Admin>` here USED to wrap the
 * demo in its own `<MemoryRouter>` and mount it as a resource LIST route
 * (pointing the router at `/posts`). Nesting a `<MemoryRouter>` inside the
 * site's router hard-crashes on hydration ("You cannot render a <Router> inside
 * another <Router>"); and even without that, driving a resource route would
 * fight the host URL. `<AdminContext>` instead supplies ONLY the providers —
 * its internal `RouterWrapper` JOINS the host router when one exists (the site)
 * and CREATES one only when none does (an isolated jsdom test). So there is no
 * nested router and no URL coupling: the demo renders directly, with its
 * resource supplied by context rather than by a matched route.
 *
 * Because the demo is not mounted at a route, we hand it its resource context
 * explicitly: `<ResourceContextProvider value="posts">` wraps every mode, so a
 * `<List>`/`<Edit>` reads `posts` from context (exactly as it would under a
 * `<Resource name="posts">`), and any `ReferenceField`/`ReferenceInput` in the
 * demo resolves its `authors` FK straight through the data provider.
 *
 * Three `mode`s supply the extra inner context a demo needs, layered inside the
 * resource context:
 *   - `view`   (default): the demo IS the view (`<List>`/`<Edit>`/…), rendered
 *              as-is; it publishes its own record/list/form context.
 *   - `record`: wraps the demo in a `RecordContextProvider` for a bare read-only
 *              field (e.g. `<TextField source="title" />`).
 *   - `input`:  wraps the demo in a `<Create>` form context for a bare input
 *              (e.g. `<TextInput source="title" />`) that registers into a form.
 */
import {
  computeDefinition,
  createResourceRegistry,
  fakeDataProvider,
  type ResourceRegistry,
} from "@chelone/core";
import {
  AdminContext,
  Create,
  RecordContextProvider,
  ResourceContextProvider,
} from "@chelone/react";
import { QueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
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

/**
 * A runtime registry pre-populated with the two preview resources — the same
 * definitions the reference app's `<Resource>` markers would register. `posts`
 * carries the full CRUD flags + a `title` record representation; `authors` backs
 * any reference lookup with a `name` representation. Built once per mount (the
 * data provider mutates its seed, so services must not leak across previews).
 */
function makePreviewRegistry(): ResourceRegistry {
  const registry = createResourceRegistry();
  registry.register(
    computeDefinition({
      name: "posts",
      hasList: true,
      hasCreate: true,
      hasEdit: true,
      hasShow: true,
      recordRepresentation: "title",
    }),
  );
  registry.register(
    computeDefinition({
      name: "authors",
      hasList: true,
      recordRepresentation: "name",
    }),
  );
  return registry;
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
  const [registry] = useState(makePreviewRegistry);

  // The demo, wrapped per mode. `record`/`input` layer their extra context
  // inside the `posts` resource context.
  let inner: ReactNode = <>{children}</>;
  if (mode === "record") {
    inner = (
      <RecordContextProvider value={previewRecord}>
        {children}
      </RecordContextProvider>
    );
  } else if (mode === "input") {
    inner = <Create resource="posts">{children}</Create>;
  }

  return (
    <AdminContext
      dataProvider={dataProvider}
      queryClient={queryClient}
      i18n={i18n}
      notifications={notifications}
      store={store}
      resources={previewResources}
      registry={registry}
    >
      {/* No nested router, no route mount: `RouterWrapper` (inside
          `<AdminContext>`) joins the site's host router, and the resource is
          supplied by context so the demo renders directly at whatever URL the
          docs page is on. */}
      <ResourceContextProvider value="posts">{inner}</ResourceContextProvider>
    </AdminContext>
  );
}
