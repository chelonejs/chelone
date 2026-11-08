import type { LooseRecord } from "../resource/record";
import { createMicroStore, type MicroStore } from "../store/micro-store";
import { matchCsvHeaders } from "./match-headers";
import { runCsvImport } from "./run-import";
import type {
  CsvImportOptions,
  CsvImportState,
  CsvImportStep,
  ParsedCsv,
} from "./types";
import { csvSchemaFields, validateCsvRows } from "./validate-rows";

const STEPS: CsvImportStep[] = ["upload", "map", "preview", "commit"];

/** How many rows either adapter's preview step lists. */
export const PREVIEW_ROWS = 50;

/** What `readAsText` writes for each byte it cannot read as UTF-8. */
export const REPLACEMENT_CHAR = "\uFFFD";

export interface CsvImportController {
  store: MicroStore<CsvImportState>;
  /** Takes the file the adapter parsed. Does nothing while an import runs. */
  loadParsed(parsed: ParsedCsv, fileName?: string): void;
  /** Maps `field` to a CSV header; `""` leaves it unmapped. */
  setMapping(field: string, header: string): void;
  /**
   * Resolves `true` when the step changed and `false` when a gate held. Once an
   * import has created rows, preview does not lead to commit again, since a
   * second run would create them twice; `reset()` or a new file starts afresh.
   */
  next(): Promise<boolean>;
  /** Goes back one step. Does nothing on the first step or while an import runs. */
  back(): void;
  /** Stops a running import before its next batch; the rows already created stay. */
  cancel(): void;
  reset(): void;
}

const asError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

export function createCsvImportController<TRecord = LooseRecord>(
  options: CsvImportOptions<TRecord>,
): CsvImportController {
  const fromSchema = csvSchemaFields(options.schema);
  const explicitFields = options.fields ?? fromSchema.fields;
  const requiredFields =
    options.requiredFields ?? (options.fields ? [] : fromSchema.required);
  const initialMapping = options.mapping ?? {};

  const initial = (): CsvImportState => ({
    step: "upload",
    fileName: null,
    headers: [],
    rows: [],
    parseError: null,
    fields: explicitFields,
    requiredFields,
    mapping: initialMapping,
    validations: [],
    progress: { current: 0, total: 0 },
    status: "idle",
    report: null,
    error: null,
  });

  const store = createMicroStore<CsvImportState>(initial());
  const state = () => store.getSnapshot();

  // The user's edits and the auto-match both count: neither is overwritten.
  let mappingSettled = Object.keys(initialMapping).length > 0;
  // Bumped by reset and by each new import, so a stale import settles into nothing.
  let generation = 0;
  let busy = false;
  // Set when a finished import created rows; see `next()` in the interface.
  let created = false;
  let abort: AbortController | undefined;

  const startImport = () => {
    const run = ++generation;
    const controller = new AbortController();
    abort = controller;
    const validations = state().validations;
    const total = validations.filter((v) => v.ok).length;
    store.setState({
      status: "running",
      progress: { current: 0, total },
      report: null,
      error: null,
    });

    void (async () => {
      let report: Awaited<ReturnType<typeof runCsvImport>>;
      try {
        report = await runCsvImport({
          dataProvider: options.dataProvider,
          resource: options.resource,
          validations,
          ...(options.batchSize !== undefined && {
            batchSize: options.batchSize,
          }),
          signal: controller.signal,
          onProgress: (progress) => {
            if (run === generation) store.setState({ progress });
          },
        });
      } catch (thrown) {
        if (run !== generation) return;
        const error = asError(thrown);
        store.setState({ status: "failed", error });
        options.onError?.(error);
        return;
      }
      if (run !== generation) return;
      if (report.created > 0) created = true;
      store.setState({ status: "done", report });
      options.onComplete?.(report);
    })();
  };

  const gate = (step: CsvImportStep): boolean => {
    const s = state();
    switch (step) {
      case "upload":
        return s.rows.length > 0 && s.parseError === null;
      case "map":
        // Without this, an unmapped schemaless file creates an empty record per row.
        return (
          s.requiredFields.every((field) => !!s.mapping[field]) &&
          Object.values(s.mapping).some(Boolean)
        );
      case "preview":
        return !created && s.validations.some((v) => v.ok);
      case "commit":
        return false;
    }
  };

  return {
    store,

    loadParsed(parsed, fileName) {
      if (state().status === "running" || busy) return;
      const first = parsed.errors[0];
      const parseError = first
        ? first.row === undefined
          ? first.message
          : `Row ${first.row}: ${first.message}`
        : null;
      const fields =
        explicitFields.length > 0 ? explicitFields : parsed.headers;
      mappingSettled = Object.keys(initialMapping).length > 0;
      created = false;
      store.setState({
        ...initial(),
        fileName: fileName ?? null,
        headers: parsed.headers,
        rows: parseError === null ? parsed.rows : [],
        parseError,
        fields,
      });
    },

    setMapping(field, header) {
      // Validation reads the mapping it started with, so an edit now would show
      // in the store but not in the preview or the import.
      if (busy) return;
      mappingSettled = true;
      store.setState((prev) => ({
        mapping: { ...prev.mapping, [field]: header },
      }));
    },

    async next() {
      if (busy) return false;
      const s = state();
      if (s.status === "running") return false;
      const index = STEPS.indexOf(s.step);
      const target = STEPS[index + 1];
      if (!target || !gate(s.step)) return false;

      if (target === "map") {
        if (!mappingSettled) {
          mappingSettled = true;
          // Fields taken from the headers map to themselves, whatever they are called.
          const mapping =
            explicitFields.length > 0
              ? matchCsvHeaders(s.fields, s.headers)
              : Object.fromEntries(s.headers.map((h) => [h, h]));
          store.setState({ mapping });
        }
        store.setState({ step: "map" });
      } else if (target === "preview") {
        busy = true;
        const run = generation;
        try {
          const validations = await validateCsvRows(s.rows, {
            mapping: s.mapping,
            ...(options.schema && { schema: options.schema }),
            ...(options.transform && { transform: options.transform }),
          });
          if (run !== generation) return false;
          store.setState({ validations, step: "preview" });
        } finally {
          // A reset cleared `busy` already; it may belong to a newer validation.
          if (run === generation) busy = false;
        }
      } else {
        store.setState({ step: "commit" });
        startImport();
      }
      return true;
    },

    back() {
      const s = state();
      if (s.status === "running" || busy) return;
      const previous = STEPS[STEPS.indexOf(s.step) - 1];
      if (!previous) return;
      store.setState({
        step: previous,
        status: "idle",
        report: null,
        error: null,
        progress: { current: 0, total: 0 },
      });
    },

    cancel() {
      abort?.abort();
    },

    reset() {
      generation += 1;
      abort?.abort();
      abort = undefined;
      busy = false;
      created = false;
      mappingSettled = Object.keys(initialMapping).length > 0;
      store.setState(initial());
    },
  };
}
