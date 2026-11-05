import { describe, expect, it, vi } from "vitest";
import { fakeDataProvider } from "../data/fake-provider";
import { csvErrorRows, runCsvImport } from "./run-import";
import type { CsvImportReport, CsvRowValidation } from "./types";

const valid = (n: number): CsvRowValidation => ({ ok: true, row: { n } });

function providerWith(create: (data: Record<string, unknown>) => unknown) {
  const dataProvider = fakeDataProvider({});
  const spy = vi
    .spyOn(dataProvider, "create")
    .mockImplementation(async (_resource, params) => {
      await create(params.data);
      return { data: { id: 1, ...params.data } };
    });
  return { dataProvider, create: spy };
}

describe("runCsvImport", () => {
  it("creates each valid row with dataProvider.create in batches of batchSize", async () => {
    let running = 0;
    let widest = 0;
    const { dataProvider, create } = providerWith(async () => {
      running += 1;
      widest = Math.max(widest, running);
      await Promise.resolve();
      running -= 1;
    });

    const report = await runCsvImport({
      dataProvider,
      resource: "items",
      validations: [1, 2, 3, 4, 5].map(valid),
      batchSize: 2,
    });

    expect(create.mock.calls).toEqual(
      [1, 2, 3, 4, 5].map((n) => ["items", { data: { n } }]),
    );
    expect(widest).toBe(2);
    expect(report).toEqual({
      total: 5,
      created: 5,
      failed: 0,
      errors: [],
      aborted: false,
    });
  });

  it("reports a rejected create with the row's own index and the error message", async () => {
    const { dataProvider } = providerWith((data) => {
      if (data.n === 3) throw new Error("Duplicate key");
    });

    const report = await runCsvImport({
      dataProvider,
      resource: "items",
      validations: [valid(1), valid(2), valid(3)],
    });

    expect(report.created).toBe(2);
    expect(report.failed).toBe(1);
    expect(report.errors).toEqual([
      { rowIndex: 2, row: { n: 3 }, reason: "Duplicate key" },
    ]);
  });

  it("counts a row that failed validation as failed without calling create", async () => {
    const { dataProvider, create } = providerWith(() => undefined);

    const report = await runCsvImport({
      dataProvider,
      resource: "items",
      validations: [
        valid(1),
        { ok: false, row: { n: 2 }, issues: ["n: Bad", "m: Worse"] },
      ],
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(report).toEqual({
      total: 2,
      created: 1,
      failed: 1,
      errors: [{ rowIndex: 1, row: { n: 2 }, reason: "n: Bad; m: Worse" }],
      aborted: false,
    });
  });

  it("calls onProgress after each batch", async () => {
    const { dataProvider } = providerWith(() => undefined);
    const onProgress = vi.fn();

    await runCsvImport({
      dataProvider,
      resource: "items",
      validations: [
        valid(1),
        { ok: false, row: { n: 2 }, issues: ["Bad"] },
        valid(3),
        valid(4),
        valid(5),
      ],
      batchSize: 2,
      onProgress,
    });

    expect(onProgress.mock.calls).toEqual([
      [{ current: 2, total: 4 }],
      [{ current: 4, total: 4 }],
    ]);
  });

  it("stops before the next batch when the signal aborts and reports aborted true", async () => {
    const controller = new AbortController();
    const { dataProvider, create } = providerWith(() => undefined);

    const report = await runCsvImport({
      dataProvider,
      resource: "items",
      validations: [1, 2, 3, 4].map(valid),
      batchSize: 2,
      signal: controller.signal,
      onProgress: () => controller.abort(),
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(report.created).toBe(2);
    expect(report.aborted).toBe(true);
  });

  it("throws RangeError for a batchSize below 1", async () => {
    const { dataProvider } = providerWith(() => undefined);

    await expect(
      runCsvImport({
        dataProvider,
        resource: "items",
        validations: [valid(1)],
        batchSize: 0,
      }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});

describe("csvErrorRows", () => {
  it("puts rowIndex and reason before the row's own fields", () => {
    const report: CsvImportReport = {
      total: 1,
      created: 0,
      failed: 1,
      errors: [
        { rowIndex: 4, row: { title: "Pen", price: "x" }, reason: "Bad" },
      ],
      aborted: false,
    };

    const [row] = csvErrorRows(report);

    expect(Object.keys(row as object)).toEqual([
      "rowIndex",
      "reason",
      "title",
      "price",
    ]);
    expect(row).toEqual({
      rowIndex: 4,
      reason: "Bad",
      title: "Pen",
      price: "x",
    });
  });

  it("keeps the real rowIndex and reason when the row has fields of those names", () => {
    const report: CsvImportReport = {
      total: 1,
      created: 0,
      failed: 1,
      errors: [
        {
          rowIndex: 2,
          row: { reason: "Refund", rowIndex: "x", amount: "" },
          reason: "amount: Required",
        },
      ],
      aborted: false,
    };

    expect(csvErrorRows(report)).toEqual([
      { rowIndex: 2, reason: "amount: Required", amount: "" },
    ]);
  });
});
