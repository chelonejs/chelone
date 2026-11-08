// @vitest-environment node
/**
 * The registry is seeded by the first render, so a server render of `<Admin>`
 * lists its resources in the menu instead of an empty one that pops in on
 * hydration. Runs under `node`: no `window`, no effects.
 */

import { fakeDataProvider, type ResourceDefinitionMap } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { type ReactNode, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Admin } from "../admin/admin";
import { Layout } from "../components/admin/layout/layout";
import { createCheloneRouter } from "../ssr/router-factory";
import { ResourceRegistryProvider } from "./registry-hooks";
import { Resource } from "./resource";

const dataProvider = fakeDataProvider({});
const List = () => <div>list</div>;

function ssrAdmin(children: ReactNode) {
  const { RouterProvider } = createCheloneRouter({ initialEntries: ["/"] });
  return (
    <RouterProvider>
      <Admin dataProvider={dataProvider} queryClient={new QueryClient()}>
        <Admin.Layout>
          <Layout />
        </Admin.Layout>
        {children}
      </Admin>
    </RouterProvider>
  );
}

describe("a server render of <Admin>", () => {
  it("a server render lists every resource in the menu", () => {
    const html = renderToString(
      ssrAdmin(
        <>
          <Resource name="posts" list={List} />
          <Resource name="comments" list={List} />
        </>,
      ),
    );
    expect(html).toContain("Posts");
    expect(html).toContain("Comments");
  });

  it("a StrictMode server render still lists each resource once", () => {
    const html = renderToString(
      <StrictMode>
        {ssrAdmin(<Resource name="posts" list={List} />)}
      </StrictMode>,
    );
    expect(html.match(/href="\/posts"/g)).toHaveLength(1);
  });
});
