/**
 * The mount the chart tests share: a chart as a resource's list page inside
 * `<Admin>`, under a memory router at that resource's route, the way a demo
 * dashboard mounts it.
 */

import type { DataProvider, ResourceMap } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { type RenderResult, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { Admin, Resource } from "../../../index";

export function mountInAdmin<TResources extends ResourceMap>(options: {
  /** The resource the chart is the list page of; also its route. */
  name: keyof TResources & string;
  resources: TResources;
  dataProvider: DataProvider<TResources>;
  page: () => ReactNode;
}): RenderResult {
  const { name, resources, dataProvider, page } = options;
  const Page = () => <>{page()}</>;

  return render(
    <MemoryRouter initialEntries={[`/${name}`]}>
      <Admin
        dataProvider={dataProvider}
        queryClient={new QueryClient()}
        resources={resources}
      >
        <Resource name={name} list={Page} />
      </Admin>
    </MemoryRouter>,
  );
}
