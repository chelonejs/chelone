import type { StandardSchemaV1 } from "@tanstack/form-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fakeDataProvider } from "../data/fake-provider";
import {
  createCsvImportController,
  PREVIEW_ROWS,
  REPLACEMENT_CHAR,
} from "./import-controller";
import type { CsvImportOptions, ParsedCsv } from "./types";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  note: z.string().optional(),
});

const parsed = (
  rows: Array<Record<string, string>>,
  headers = Object.keys(rows[0] ?? {}),
): ParsedCsv => ({ headers, rows, errors: [] });

// type-escape: the tests pass schemas with no `id`, and a bare StandardSchemaV1 has an unknown output
function setup(options: Partial<CsvImportOptions<unknown>> = {}) {
  const dataProvider = fakeDataProvider({});
  const create = vi
    .spyOn(dataProvider, "create")
    .mockImplementation(async (_resource, params) => ({
      data: { id: 1, ...params.data },
    }));
  const controller = createCsvImportController({
    dataProvider,
    resource: "people",
    schema,
    ...options,
  });
  const state = () => controller.store.getSnapshot();
  return { controller, create, state };
}

const goodRows = [
  { Name: "Ada", Email: "ada@example.com" },
  { Name: "Bob", Email: "bob@example.com" },
];

describe("createCsvImportController", () => {
  it("starts on the upload step with no rows", () => {
    const { state } = setup();
    expect(state()).toMatchObject({
      step: "upload",
      fileName: null,
      headers: [],
      rows: [],
      parseError: null,
      fields: ["name", "email", "note"],
      requiredFields: ["name", "email"],
      mapping: {},
      validations: [],
      progress: { current: 0, total: 0 },
      status: "idle",
      report: null,
      error: null,
    });
  });

  it("loadParsed stores headers and rows and sets parseError for a parsed file with errors", () => {
    const { controller, state } = setup();
    controller.loadParsed(parsed(goodRows), "people.csv");
    expect(state()).toMatchObject({
      fileName: "people.csv",
      headers: ["Name", "Email"],
      rows: goodRows,
      parseError: null,
    });

    controller.loadParsed({
      headers: ["Name"],
      rows: goodRows,
      errors: [
        { code: "TooFewFields", row: 2, message: "Too few fields" },
        { code: "Other", message: "second" },
      ],
    });
    expect(state()).toMatchObject({
      headers: ["Name"],
      rows: [],
      parseError: "Row 2: Too few fields",
    });
  });

  it("names the row of a parse error", () => {
    const { controller, state } = setup({ schema: undefined });
    controller.loadParsed({
      headers: ["a", "b", "c"],
      rows: [{ a: "1", b: "2", c: "3" }],
      errors: [
        {
          code: "TooFewFields",
          row: 2,
          message: "Too few fields: expected 3 fields but parsed 2",
        },
      ],
    });

    expect(state().parseError).toBe(
      "Row 2: Too few fields: expected 3 fields but parsed 2",
    );
    expect(state().rows).toEqual([]);
  });

  it("next on upload stays put until a file with rows is loaded", async () => {
    const { controller, state } = setup();
    expect(await controller.next()).toBe(false);
    expect(state().step).toBe("upload");

    controller.loadParsed(parsed([], ["Name"]));
    expect(await controller.next()).toBe(false);

    controller.loadParsed({
      headers: ["Name"],
      rows: [],
      errors: [{ code: "x", message: "bad file" }],
    });
    expect(await controller.next()).toBe(false);
    expect(state().step).toBe("upload");

    controller.loadParsed(parsed(goodRows));
    expect(await controller.next()).toBe(true);
    expect(state().step).toBe("map");
  });

  it("entering the map step auto-matches headers to the schema fields once", async () => {
    const { controller, state } = setup();
    controller.loadParsed(parsed(goodRows));
    await controller.next();
    expect(state().mapping).toEqual({ name: "Name", email: "Email" });

    controller.setMapping("email", "");
    await controller.next();
    controller.back();
    controller.back();
    await controller.next();
    expect(state().mapping).toEqual({ name: "Name", email: "" });
  });

  it("a mapping passed in options is kept and not replaced by the auto-match", async () => {
    const { controller, state } = setup({ mapping: { name: "Email" } });
    controller.loadParsed(parsed(goodRows));
    await controller.next();
    expect(state().mapping).toEqual({ name: "Email" });
  });

  it("without a schema the fields are the CSV headers mapped to themselves", async () => {
    const { controller, state } = setup({ schema: undefined });
    controller.loadParsed(parsed([{ "First name": "Ada", city: "Paris" }]));
    expect(state().fields).toEqual(["First name", "city"]);
    await controller.next();
    expect(state().mapping).toEqual({
      "First name": "First name",
      city: "city",
    });
    expect(await controller.next()).toBe(true);
    expect(state().validations).toEqual([
      { ok: true, row: { "First name": "Ada", city: "Paris" } },
    ]);
  });

  async function toPreview(
    controller: ReturnType<typeof setup>["controller"],
    rows: Array<Record<string, string>>,
  ) {
    controller.loadParsed(parsed(rows));
    await controller.next();
    await controller.next();
  }

  const settled = (controller: ReturnType<typeof setup>["controller"]) =>
    vi.waitFor(() => {
      const { status } = controller.store.getSnapshot();
      if (status === "running" || status === "idle") throw new Error(status);
    });

  it("next on map stays put while a required field is unmapped", async () => {
    const { controller, state } = setup();
    controller.loadParsed(parsed([{ Name: "Ada", Other: "x" }]));
    await controller.next();
    expect(state().mapping).toEqual({ name: "Name" });
    expect(await controller.next()).toBe(false);
    expect(state().step).toBe("map");

    controller.setMapping("email", "Other");
    expect(await controller.next()).toBe(true);
    expect(state().step).toBe("preview");
  });

  it("does not advance with no field mapped", async () => {
    const { controller, state } = setup({ schema: undefined });
    controller.loadParsed(parsed([{ a: "1", b: "2" }]));
    await controller.next();
    controller.setMapping("a", "");
    controller.setMapping("b", "");

    expect(await controller.next()).toBe(false);
    expect(state().step).toBe("map");

    controller.setMapping("b", "b");
    expect(await controller.next()).toBe(true);
    expect(state().step).toBe("preview");
  });

  it("entering preview validates the rows and counts valid and invalid ones", async () => {
    const { controller, state } = setup();
    await toPreview(controller, [
      ...goodRows,
      { Name: "", Email: "not-an-email" },
    ]);
    const { validations, step } = state();
    expect(step).toBe("preview");
    expect(validations.filter((v) => v.ok)).toHaveLength(2);
    expect(validations.filter((v) => !v.ok)).toHaveLength(1);
  });

  it("next on preview stays put when no row is valid", async () => {
    const { controller, state, create } = setup();
    await toPreview(controller, [{ Name: "", Email: "nope" }]);
    expect(await controller.next()).toBe(false);
    expect(state().step).toBe("preview");
    expect(create).not.toHaveBeenCalled();
  });

  it("entering commit starts the import once even when next is called twice", async () => {
    const { controller, state, create } = setup();
    await toPreview(controller, goodRows);
    const results = await Promise.all([controller.next(), controller.next()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await controller.next()).toBe(false);
    await settled(controller);
    expect(state().step).toBe("commit");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("the store reports progress while batches run and the report when done", async () => {
    const { controller, state } = setup({ batchSize: 1 });
    const seen: Array<[string, number, number]> = [];
    controller.store.subscribe(() => {
      const { status, progress } = state();
      seen.push([status, progress.current, progress.total]);
    });
    await toPreview(controller, goodRows);
    await controller.next();
    await settled(controller);

    expect(seen).toContainEqual(["running", 0, 2]);
    expect(seen).toContainEqual(["running", 1, 2]);
    expect(state().status).toBe("done");
    expect(state().progress).toEqual({ current: 2, total: 2 });
    expect(state().report).toEqual({
      total: 2,
      created: 2,
      failed: 0,
      errors: [],
      aborted: false,
    });
  });

  it("onComplete gets the report and onError gets a thrown error with status failed", async () => {
    const onComplete = vi.fn();
    const ok = setup({ onComplete });
    await toPreview(ok.controller, goodRows);
    await ok.controller.next();
    await settled(ok.controller);
    expect(onComplete).toHaveBeenCalledWith(ok.state().report);

    const onError = vi.fn();
    const failing = setup({ onError, onComplete, batchSize: 0 });
    await toPreview(failing.controller, goodRows);
    await failing.controller.next();
    await settled(failing.controller);
    expect(failing.state().status).toBe("failed");
    expect(failing.state().error).toBeInstanceOf(RangeError);
    expect(onError).toHaveBeenCalledWith(failing.state().error);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("cancel aborts a running import and keeps what was created", async () => {
    const { controller, state, create } = setup({ batchSize: 1 });
    await toPreview(controller, goodRows);
    await controller.next();
    controller.cancel();
    await settled(controller);

    expect(state().report).toMatchObject({ created: 1, aborted: true });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("back moves one step and does nothing while the import runs", async () => {
    const { controller, state } = setup();
    controller.back();
    expect(state().step).toBe("upload");

    await toPreview(controller, goodRows);
    controller.back();
    expect(state().step).toBe("map");
    await controller.next();

    await controller.next();
    expect(state().status).toBe("running");
    controller.back();
    expect(state().step).toBe("commit");

    await settled(controller);
    controller.back();
    expect(state().step).toBe("preview");
    expect(state().status).toBe("idle");
  });

  it("back after a cancelled import does not let the rows be created again", async () => {
    const { controller, state, create } = setup({ batchSize: 1 });
    await toPreview(controller, goodRows);
    await controller.next();
    controller.cancel();
    await settled(controller);
    controller.back();

    expect(state().step).toBe("preview");
    expect(await controller.next()).toBe(false);
    expect(state().step).toBe("preview");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("setMapping while the rows are being validated is ignored", async () => {
    const { controller, state } = setup();
    controller.loadParsed(parsed(goodRows));
    await controller.next();
    const moving = controller.next();
    controller.setMapping("email", "Name");
    await moving;
    expect(state().mapping).toEqual({ name: "Name", email: "Email" });
    expect(state().validations.every((v) => v.ok)).toBe(true);
  });

  it("a validation that was reset away does not unblock the one that replaced it", async () => {
    const gates: Array<() => void> = [];
    const gated: StandardSchemaV1 = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) =>
          new Promise((resolve) => {
            gates.push(() => resolve({ value }));
          }),
      },
    };
    const { controller, state } = setup({ schema: gated });
    const rows = [{ a: "1" }];

    controller.loadParsed(parsed(rows));
    await controller.next();
    const stale = controller.next();
    controller.reset();
    controller.loadParsed(parsed(rows));
    await controller.next();
    const current = controller.next();

    gates[0]?.();
    expect(await stale).toBe(false);
    expect(await controller.next()).toBe(false);
    controller.back();
    expect(state().step).toBe("map");

    gates[1]?.();
    expect(await current).toBe(true);
    expect(state().step).toBe("preview");
  });

  it("reset returns to the initial state", async () => {
    const { controller, state } = setup();
    const initial = state();
    await toPreview(controller, goodRows);
    await controller.next();
    controller.reset();
    expect(state()).toEqual(initial);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(state()).toEqual(initial);
  });
});

describe("csv import constants", () => {
  it("the preview lists 50 rows, and a byte readAsText cannot decode arrives as U+FFFD", () => {
    expect(PREVIEW_ROWS).toBe(50);
    expect(REPLACEMENT_CHAR).toBe("\uFFFD");
  });
});
