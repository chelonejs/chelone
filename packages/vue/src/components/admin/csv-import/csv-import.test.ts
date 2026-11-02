/**
 * `<CsvImport>` — an Import button that opens a four-step sheet: upload a CSV
 * file, map its columns to fields, preview the rows, then create them. Mounted
 * under a real `<Admin>` with a resource whose list view renders the button.
 */

import {
  type CsvImportReport,
  type DataProvider,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type VNodeChild } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../../../admin/admin.vue";
import { downloadCSV } from "../buttons/export";
import List from "../view/list.vue";
import CsvImport from "./csv-import.vue";
import { useCsvImport } from "./use-csv-import";

vi.mock("../buttons/export", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../buttons/export")>()),
  downloadCSV: vi.fn(),
}));

const mounted: VueWrapper[] = [];

beforeEach(() => {
  vi.mocked(downloadCSV).mockClear();
});
afterEach(() => {
  for (const wrapper of mounted.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
});

const schema = z.object({
  title: z.string().min(1),
  views: z.coerce.number(),
  note: z.string().optional(),
});

const GOOD_CSV = "title,views\nHello,1\nWorld,2\n";
const MIXED_CSV = "title,views\nHello,1\n,2\nWorld,3\n";

const makeProvider = (): DataProvider => fakeDataProvider({ posts: [] });

/** A `<List>` of posts under a real `<Admin>`, with `children` in its body. */
async function mountImport(
  children: () => VNodeChild,
  dataProvider: DataProvider = makeProvider(),
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/:pathMatch(.*)*", component: { render: () => null } },
    ],
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        {
          dataProvider,
          queryClient: new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
        },
        {
          default: () => h(List, { resource: "posts" }, { default: children }),
        },
      ),
  });
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [router] },
  });
  mounted.push(wrapper);
  await flushPromises();
  return { wrapper, dataProvider };
}

const importWith = (
  props: Record<string, unknown> = {},
  dataProvider?: DataProvider,
) => mountImport(() => h(CsvImport, { schema, ...props }), dataProvider);

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const buttonNamed = (name: string) =>
  [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === name,
  ) as HTMLButtonElement | undefined;
const click = async (name: string) => {
  const button = buttonNamed(name);
  if (!button) throw new Error(`no button named ${name}`);
  button.click();
  await flushPromises();
};
const nextButton = () => buttonNamed("Next");
const mapSelect = (field: string) =>
  document.querySelector(
    `select[data-csv-field="${field}"]`,
  ) as HTMLSelectElement;
const heading = () => dialog()?.querySelector("h2")?.textContent?.trim();
const text = () => dialog()?.textContent ?? "";

/** Wait for a condition the FileReader or the import loop settles. */
const until = (check: () => boolean) =>
  vi.waitFor(async () => {
    await flushPromises();
    expect(check()).toBe(true);
  });

const openSheet = async () => {
  await click("Import");
};

const uploadFile = async (csv: string, name = "posts.csv") => {
  const input = document.querySelector<HTMLInputElement>(
    '[data-testid="csv-file-input"]',
  ) as HTMLInputElement;
  const file = new File([csv], name, { type: "text/csv" });
  Object.defineProperty(input, "files", {
    value: [file],
    configurable: true,
  });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await flushPromises();
};

const setMapping = async (field: string, value: string) => {
  const select = mapSelect(field);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await flushPromises();
};

async function runToCommit(csv: string) {
  await uploadFile(csv);
  await until(() => /rows parsed/.test(text()));
  await click("Next");
  expect(heading()).toBe("Map columns");
  await click("Next");
  await until(() => heading() === "Preview");
  await click("Next");
}

describe("<CsvImport>", () => {
  it("an Import button opens the sheet on the upload step", async () => {
    await importWith();
    expect(dialog()).toBeNull();

    await openSheet();

    expect(dialog()).not.toBeNull();
    expect(heading()).toBe("Upload");
    expect(
      document.querySelector('input[type="file"][accept=".csv"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-testid="csv-file-input"]'),
    ).not.toBeNull();
    expect(nextButton()?.disabled).toBe(true);
  });

  it("uploading a CSV file shows its row count and enables Next", async () => {
    await importWith();
    await openSheet();

    await uploadFile(GOOD_CSV);

    await until(() => text().includes("2 rows parsed"));
    expect(text()).toContain("posts.csv");
    expect(nextButton()?.disabled).toBe(false);
  });

  it("a file with a parse error shows the message and stays on the upload step", async () => {
    await importWith();
    await openSheet();

    await uploadFile('title,views\n"Hello,1\n');

    await until(() => dialog()?.querySelector('[role="alert"]') != null);
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toMatch(
      /quote/i,
    );
    expect(text()).not.toContain("rows parsed");
    expect(nextButton()?.disabled).toBe(true);
    expect(heading()).toBe("Upload");
  });

  it("the map step selects the header that matches each schema field", async () => {
    await importWith();
    await openSheet();
    await uploadFile("Views,TITLE,extra\n1,Hello,x\n");
    await until(() => text().includes("1 rows parsed"));

    await click("Next");

    expect(heading()).toBe("Map columns");
    expect(mapSelect("title").value).toBe("TITLE");
    expect(mapSelect("views").value).toBe("Views");
    expect(mapSelect("note").value).toBe("");
    expect(dialog()?.querySelectorAll("label span")).toHaveLength(2);
  });

  it("Next on the map step stays put while a required field is unmapped", async () => {
    await importWith();
    await openSheet();
    await uploadFile(GOOD_CSV);
    await until(() => text().includes("2 rows parsed"));
    await click("Next");

    await setMapping("title", "");

    expect(text()).toMatch(/required fields are not mapped/i);
    expect(nextButton()?.disabled).toBe(true);
    await click("Next");
    expect(heading()).toBe("Map columns");
  });

  it("the preview counts valid rows and rows with errors", async () => {
    await importWith();
    await openSheet();
    await uploadFile(MIXED_CSV);
    await until(() => text().includes("3 rows parsed"));
    await click("Next");
    await click("Next");

    await until(() => heading() === "Preview");
    expect(text()).toContain("2 valid · 1 errors · 3 total");
    expect(
      [...(dialog()?.querySelectorAll("th") ?? [])].map((th) => th.textContent),
    ).toContain("Issues");
    expect(dialog()?.querySelectorAll("tbody tr")).toHaveLength(3);
  });
});

describe("<CsvImport> commit step", () => {
  it("the commit step creates each valid row with dataProvider.create and shows Import complete", async () => {
    const dataProvider = makeProvider();
    const create = vi.spyOn(dataProvider, "create");
    const onComplete = vi.fn();
    await importWith({ onComplete }, dataProvider);
    await openSheet();

    await runToCommit(GOOD_CSV);

    await until(() => text().includes("Import complete"));
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith("posts", {
      data: { title: "Hello", views: 1 },
    });
    expect(create).toHaveBeenCalledWith("posts", {
      data: { title: "World", views: 2 },
    });
    expect(text()).toContain("2 created · 0 failed · 2 total");
    expect(buttonNamed("Download error report")).toBeUndefined();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(buttonNamed("Close")).toBeDefined();
  });

  it("a row that fails to create is in the report and Download error report calls downloadCSV with it", async () => {
    const dataProvider = makeProvider();
    const real = dataProvider.create.bind(dataProvider);
    vi.spyOn(dataProvider, "create").mockImplementation(((
      resource: string,
      params: { data: { title: string } },
    ) =>
      params.data.title === "World"
        ? Promise.reject(new Error("duplicate title"))
        : real(resource, params as never)) as DataProvider["create"]);
    let report: CsvImportReport | undefined;
    await importWith(
      {
        onComplete: (r: CsvImportReport) => {
          report = r;
        },
      },
      dataProvider,
    );
    await openSheet();

    await runToCommit(GOOD_CSV);

    await until(() => text().includes("Import complete"));
    expect(text()).toContain("1 created · 1 failed · 2 total");
    expect(report?.errors).toHaveLength(1);

    await click("Download error report");

    expect(downloadCSV).toHaveBeenCalledTimes(1);
    const [csv, filename] = vi.mocked(downloadCSV).mock.calls[0] ?? [];
    expect(filename).toBe("import-errors");
    expect(csv).toContain("duplicate title");
    expect(csv).toContain("World");
  });
});

describe("<CsvImport> closing", () => {
  it("closing the sheet clears the file and the mapping", async () => {
    await importWith();
    await openSheet();
    await uploadFile("Views,TITLE\n1,Hello\n");
    await until(() => /rows parsed/.test(text()));
    await click("Next");
    await setMapping("title", "Views");
    expect(mapSelect("title").value).toBe("Views");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(dialog()).toBeNull();
    await openSheet();

    expect(heading()).toBe("Upload");
    expect(text()).not.toContain("rows parsed");
    expect(nextButton()?.disabled).toBe(true);

    await uploadFile("Views,TITLE\n1,Hello\n");
    await until(() => /rows parsed/.test(text()));
    await click("Next");
    expect(mapSelect("title").value).toBe("TITLE");
  });

  it("children render inside the context and can call useCsvImport", async () => {
    const Probe = defineComponent({
      setup() {
        const { state } = useCsvImport();
        return () => h("p", `step is ${state.value.step}`);
      },
    });
    const { wrapper } = await mountImport(() =>
      h(CsvImport, { schema }, { default: () => h(Probe) }),
    );

    expect(wrapper.text()).toContain("step is upload");
  });
});

describe("useCsvImport", () => {
  it("useCsvImport throws outside CsvImport", () => {
    const Bare = defineComponent({
      setup() {
        useCsvImport();
        return () => null;
      },
    });
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => mount(Bare)).toThrow(
      "useCsvImport must be used inside <CsvImport>",
    );
    spy.mockRestore();
  });
});
