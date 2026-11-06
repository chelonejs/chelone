import {
  type BlockAttrs,
  fakeDataProvider,
  isBlockDoc,
  type ResourceDefinition,
} from "@chelone/core";
import { defined, elementOf } from "@chelone/test-utils";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  doc,
  mountBlockEditor,
  stubLayout,
  unmountAll,
} from "./__fixtures__/block-editor-harness";
import { dataBlocks } from "./data-blocks";

beforeAll(stubLayout);
afterEach(unmountAll);

const posts = [
  { id: 1, title: "Hello", status: "draft", views: 12, author: "Ada" },
  { id: 2, title: "Second", status: "live", views: 3, author: "Bo" },
  { id: 3, title: "Third", status: "live", views: 7, author: "Cy" },
];

const resources: ResourceDefinition[] = ["posts", "users"].map((name) => ({
  name,
  hasList: true,
  hasCreate: false,
  hasEdit: false,
  hasShow: false,
}));

async function mount(
  type: string,
  attrs: BlockAttrs,
  tables: Parameters<typeof fakeDataProvider>[0] = { posts },
) {
  // The closing paragraph keeps the editor from adding its own.
  const body = doc(
    { type, attrs },
    { type: "paragraph", content: [{ type: "text", text: "End" }] },
  );
  const mounted = await mountBlockEditor(
    { blocks: dataBlocks },
    { body, dataProvider: fakeDataProvider(tables), resources },
  );
  await flushPromises();
  return mounted;
}

const texts = (selector: string) =>
  [...document.querySelectorAll(selector)].map(
    (element) => element.textContent,
  );

const alert = () => document.querySelector('[role="alert"]');

/** The control a label names. */
const controlOf = (label: string) => {
  const target = [...document.querySelectorAll("label")].find(
    (element) => element.textContent === label,
  );
  return elementOf(
    document.getElementById(defined(target).htmlFor),
    HTMLElement,
  );
};

async function openConfig(mounted: Awaited<ReturnType<typeof mount>>) {
  mounted.editor().commands.setNodeSelection(0);
  await flushPromises();
  elementOf(
    document.querySelector('button[aria-label="Configure"]'),
    HTMLButtonElement,
  ).click();
  await flushPromises();
}

async function typeInto(label: string, value: string) {
  const input = elementOf(controlOf(label), HTMLInputElement);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flushPromises();
}

async function choose(label: string, value: string) {
  const select = elementOf(controlOf(label), HTMLSelectElement);
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await flushPromises();
}

const firstBlock = (
  onSubmit: Awaited<ReturnType<typeof mount>>["onSubmit"],
) => {
  const body = onSubmit.mock.calls.at(-1)?.[0].body;
  return isBlockDoc(body) ? body.content?.[0] : undefined;
};

describe("data blocks", () => {
  it("a reference record shows the record's title and fields", async () => {
    await mount("referenceRecord", {
      resource: "posts",
      id: 1,
      fields: ["status", "views"],
      layout: "card",
    });
    await expect.poll(() => texts("[data-block] h3")).toEqual(["Hello"]);
    expect(texts("dt")).toEqual(["Status", "Views"]);
    expect(texts("dd")).toEqual(["draft", "12"]);
    expect(document.body.textContent).not.toContain("Ada");
  });

  it("a reference record shows the empty state until configured, and the error state for a missing record", async () => {
    await mount("referenceRecord", { resource: "posts" });
    expect(document.body.textContent).toContain(
      "Choose a resource and a record id",
    );
    expect(alert()).toBeNull();
    unmountAll();

    await mount("referenceRecord", { resource: "posts", id: 99 });
    await expect
      .poll(() => alert()?.textContent)
      .toBe("The record could not be loaded");
  });

  it("a reference record in the inline layout shows the title alone in a badge", async () => {
    await mount("referenceRecord", {
      resource: "posts",
      id: 2,
      fields: ["status"],
      layout: "inline",
    });
    await expect.poll(() => texts('[data-slot="badge"]')).toEqual(["Second"]);
    expect(document.querySelector("dt")).toBeNull();
  });

  it("a record list shows perPage rows of the resource", async () => {
    await mount("recordList", { resource: "posts", perPage: 2 });
    await expect.poll(() => document.querySelector("table")).not.toBeNull();
    const rows = [...document.querySelectorAll("tr")];
    // The header and two of the three records, with three columns after `id`.
    expect(rows).toHaveLength(3);
    expect(texts("th")).toEqual(["Title", "Status", "Views"]);
    expect(
      [...defined(rows[1]).querySelectorAll("td")].map((c) => c.textContent),
    ).toEqual(["Hello", "draft", "12"]);
    expect(document.querySelector("table")?.textContent).not.toContain("Third");
  });

  it("a record list shows only the fields it is given", async () => {
    await mount("recordList", {
      resource: "posts",
      perPage: 5,
      fields: ["author", "title"],
    });
    await expect.poll(() => texts("th")).toEqual(["Author", "Title"]);
    expect(document.querySelectorAll("tr")).toHaveLength(4);
  });

  it("the config picks a resource from the registered resources", async () => {
    const mounted = await mount("recordList", { resource: "", perPage: 5 });
    await openConfig(mounted);

    const select = elementOf(controlOf("Resource"), HTMLSelectElement);
    expect([...select.options].map((option) => option.value)).toEqual([
      "",
      "posts",
      "users",
    ]);
    await choose("Resource", "users");
    await mounted.submit();

    expect(firstBlock(mounted.onSubmit)?.attrs).toMatchObject({
      resource: "users",
      perPage: 5,
    });
  });

  it("the config writes the fields as a list and the id as given", async () => {
    const mounted = await mount("referenceRecord", {
      resource: "posts",
      id: 1,
    });
    await openConfig(mounted);
    await typeInto("Fields", "status, views,");
    await typeInto("Record id", "2");
    await choose("Layout", "inline");
    await mounted.submit();

    expect(firstBlock(mounted.onSubmit)?.attrs).toMatchObject({
      resource: "posts",
      id: "2",
      fields: ["status", "views"],
      layout: "inline",
    });
  });

  it("record values with markup render as text", async () => {
    const markup = "<img src=x onerror=alert(1)>";
    const tables = { posts: [{ id: 1, title: markup, status: markup }] };
    await mount(
      "referenceRecord",
      { resource: "posts", id: 1, fields: ["status"] },
      tables,
    );
    await expect.poll(() => texts("h3, dd")).toEqual([markup, markup]);
    expect(document.querySelector("img")).toBeNull();
    unmountAll();

    await mount("recordList", { resource: "posts", perPage: 5 }, tables);
    await expect.poll(() => texts("td")).toEqual([markup, markup]);
    expect(document.querySelector("img")).toBeNull();
  });

  it("data blocks are offered in the picker when listed in blocks", async () => {
    const { editor } = await mountBlockEditor({ blocks: dataBlocks });
    editor().commands.focus();
    editor().commands.insertContent("/");
    await expect
      .poll(() => texts('[role="option"]'))
      .toEqual([
        expect.stringContaining("Reference record"),
        expect.stringContaining("Record list"),
        expect.stringContaining("Chart"),
      ]);
  });
});
