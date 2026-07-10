/**
 * V3-b Task 2 gate probes for the button surface: the nav buttons
 * (`<CreateButton>`/`<EditButton>`/`<ShowButton>`/`<ListButton>`) render an
 * anchor to the right `createPath`; `<CancelButton>` navigates back;
 * `<DeleteButton>` deletes the ambient record (through a stubbed confirm);
 * `<RefreshButton>` invalidates the query cache; `<SortButton>` drives
 * `setSort`; `<FilterButton>` toggles displayed filters + clears all;
 * `<SidebarToggleButton>` toggles the sidebar. Mounted under a real `<Admin>` +
 * vue-router (the Task-5 controller harness).
 */

import { defineResources, fakeDataProvider } from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { z } from "zod";
import Admin from "../../admin/admin.vue";
import { type ListContextValue, useListContext } from "../../list/list-context";
import { provideRecordContext } from "../../record/record-context";
import { SidebarProvider, useSidebar } from "../ui/sidebar";
import CancelButton from "./buttons/cancel-button.vue";
import CreateButton from "./buttons/create-button.vue";
import DeleteButton from "./buttons/delete-button.vue";
import EditButton from "./buttons/edit-button.vue";
import FilterButton from "./buttons/filter-button.vue";
import ListButton from "./buttons/list-button.vue";
import RefreshButton from "./buttons/refresh-button.vue";
import ShowButton from "./buttons/show-button.vue";
import SidebarToggleButton from "./buttons/sidebar-toggle-button.vue";
import SortButton from "./buttons/sort-button.vue";
import List from "./view/list.vue";

const resources = defineResources({
  posts: {
    schema: z.object({ id: z.number(), title: z.string() }),
  },
});
type Resources = typeof resources;
interface Post {
  id: number;
  title: string;
}

const seed: Post[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  title: `t${i + 1}`,
}));

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", component: { render: () => null } },
    ],
  });
}

function mountAdmin(render: () => VNodeChild, router: Router = makeRouter()) {
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone(seed),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Harness = defineComponent({
    setup() {
      return () => h(Admin, { dataProvider, queryClient }, { default: render });
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  return { wrapper, dataProvider, queryClient, router };
}

/** A wrapper that publishes `record` into `RecordContext` for its slot. */
function withRecord(record: Post, child: () => VNodeChild) {
  return defineComponent({
    setup() {
      provideRecordContext(record);
      return () => child();
    },
  });
}

const listProbe = (capture: { list?: ListContextValue }) =>
  defineComponent({
    setup() {
      capture.list = useListContext();
      return () => null;
    },
  });

const settled = (capture: { list?: ListContextValue }) =>
  vi.waitFor(() => expect(capture.list?.isPending).toBe(false));

describe("nav buttons", () => {
  it("<CreateButton> links to the resource create path", () => {
    const { wrapper } = mountAdmin(() =>
      h(CreateButton, { resource: "posts" }),
    );
    const a = wrapper.find('[data-slot="create-button"]');
    expect(a.exists()).toBe(true);
    expect(a.attributes("href")).toBe("/posts/create");
  });

  it("<EditButton> links to the record edit path", () => {
    const { wrapper } = mountAdmin(() =>
      h(
        withRecord({ id: 2, title: "t2" }, () =>
          h(EditButton, { resource: "posts" }),
        ),
      ),
    );
    const a = wrapper.find('[data-slot="edit-button"]');
    expect(a.attributes("href")).toBe("/posts/2");
  });

  it("<ShowButton> links to the record show path", () => {
    const { wrapper } = mountAdmin(() =>
      h(
        withRecord({ id: 3, title: "t3" }, () =>
          h(ShowButton, { resource: "posts" }),
        ),
      ),
    );
    const a = wrapper.find('[data-slot="show-button"]');
    expect(a.attributes("href")).toBe("/posts/3/show");
  });

  it("<EditButton> renders nothing without a record", () => {
    const { wrapper } = mountAdmin(() => h(EditButton, { resource: "posts" }));
    expect(wrapper.find('[data-slot="edit-button"]').exists()).toBe(false);
  });

  it("<ListButton> links to the resource list path", () => {
    const { wrapper } = mountAdmin(() => h(ListButton, { resource: "posts" }));
    const a = wrapper.find('[data-slot="list-button"]');
    expect(a.attributes("href")).toBe("/posts");
  });
});

describe("<CancelButton>", () => {
  it("navigates back to the previous entry", async () => {
    const router = makeRouter();
    await router.push("/posts");
    await router.push("/posts/create");
    const { wrapper } = mountAdmin(() => h(CancelButton), router);

    await wrapper.find('[data-slot="cancel-button"]').trigger("click");
    await vi.waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe("/posts"),
    );
  });
});

describe("<DeleteButton>", () => {
  it("deletes the ambient record after confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { wrapper, dataProvider } = mountAdmin(() =>
      h(
        withRecord({ id: 2, title: "t2" }, () =>
          h(DeleteButton, { resource: "posts", redirect: false }),
        ),
      ),
    );
    const deleteSpy = vi.spyOn(dataProvider, "delete");

    await wrapper.find('[data-slot="delete-button"]').trigger("click");

    await vi.waitFor(() => expect(deleteSpy).toHaveBeenCalledTimes(1));
    expect(deleteSpy.mock.calls[0][0]).toBe("posts");
    expect(deleteSpy.mock.calls[0][1]).toMatchObject({ id: 2 });
    confirmSpy.mockRestore();
  });

  it("does nothing when the confirm is declined", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { wrapper, dataProvider } = mountAdmin(() =>
      h(
        withRecord({ id: 2, title: "t2" }, () =>
          h(DeleteButton, { resource: "posts", redirect: false }),
        ),
      ),
    );
    const deleteSpy = vi.spyOn(dataProvider, "delete");

    await wrapper.find('[data-slot="delete-button"]').trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(deleteSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});

describe("<RefreshButton>", () => {
  it("invalidates every query on click", async () => {
    const { wrapper, queryClient } = mountAdmin(() => h(RefreshButton));
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await wrapper.find('[data-slot="refresh-button"]').trigger("click");
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });
});

describe("<SortButton>", () => {
  it("drives setSort for the clicked field", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(SortButton, { fields: ["title", "id"] }),
          ],
        },
      ),
    );
    await settled(capture);

    await wrapper.find('[data-slot="sort-button"]').trigger("click");
    await wrapper.find('[data-field="title"]').trigger("click");

    await vi.waitFor(() =>
      expect(capture.list?.sort?.[0]).toMatchObject({ field: "title" }),
    );
  });
});

describe("<FilterButton>", () => {
  it("toggles a displayed filter via showFilter", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(FilterButton, { filters: [{ source: "title" }] }),
          ],
        },
      ),
    );
    await settled(capture);

    await wrapper
      .find('[data-slot="filter-button"] .add-filter')
      .trigger("click");
    await wrapper.find('[data-field="title"]').trigger("click");

    await vi.waitFor(() =>
      expect(capture.list?.displayedFilters?.title).toBe(true),
    );
  });

  it("clears all filters via remove-all", async () => {
    const capture: { list?: ListContextValue } = {};
    const { wrapper } = mountAdmin(() =>
      h(
        List,
        { resource: "posts" },
        {
          default: () => [
            h(listProbe(capture)),
            h(FilterButton, { filters: [{ source: "title" }] }),
          ],
        },
      ),
    );
    await settled(capture);
    // Seed an active filter so the remove-all item renders.
    capture.list?.setFilters({ title: "t1" }, {});
    await vi.waitFor(() =>
      expect(Object.keys(capture.list?.filter ?? {}).length).toBeGreaterThan(0),
    );

    await wrapper
      .find('[data-slot="filter-button"] .add-filter')
      .trigger("click");
    await wrapper.find('[data-slot="remove-all-filters"]').trigger("click");

    await vi.waitFor(() =>
      expect(Object.keys(capture.list?.filter ?? {}).length).toBe(0),
    );
  });
});

describe("<SidebarToggleButton>", () => {
  it("toggles the sidebar open state", async () => {
    const capture: { open?: boolean } = {};
    const probe = defineComponent({
      setup() {
        const { open } = useSidebar();
        return () => {
          capture.open = open.value;
          return null;
        };
      },
    });
    const { wrapper } = mountAdmin(() =>
      h(SidebarProvider, null, {
        default: () => [h(probe), h(SidebarToggleButton)],
      }),
    );
    expect(capture.open).toBe(true);

    await wrapper.find('[data-slot="sidebar-toggle-button"]').trigger("click");
    expect(capture.open).toBe(false);
  });
});
