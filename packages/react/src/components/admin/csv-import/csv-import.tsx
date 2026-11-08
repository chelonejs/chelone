import {
  type CsvImportReport,
  type CsvImportState,
  type CsvRow,
  type CsvTransform,
  createCsvImportController,
  csvErrorRows,
  downloadCSV,
  type LooseRecord,
  PREVIEW_ROWS,
  parseCsvWith,
  REPLACEMENT_CHAR,
  recordsToCSV,
  type SourceKey,
} from "@chelone/core";
import type { StandardSchemaV1 } from "@tanstack/form-core";
import { Upload } from "lucide-react";
import Papa from "papaparse";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ErrorCode, type FileRejection, useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataProvider } from "../../../compat-hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useResourceContext } from "../../../resource";
import { CsvImportContext, useCsvImport } from "./use-csv-import";

/** What the upload step tells the user beside the file's own parse result. */
type UploadNotice = "wrong_file" | "not_utf8" | null;

// FileReader rather than Blob.text(), which jsdom does not implement.
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsText(file);
  });

export interface CsvImportProps<TRecord = LooseRecord> {
  /** A Standard Schema (zod, valibot, ...). Its keys are the fields; its non-optional keys are required. */
  // type-escape: a CSV cell is a string, so the schema takes any input and its output is the record
  schema?: StandardSchemaV1<unknown, TRecord>;
  /** Overrides the schema's keys. Without either, the CSV headers are the fields. */
  fields?: SourceKey<TRecord>[];
  /** Overrides the schema's non-optional keys. */
  requiredFields?: SourceKey<TRecord>[];
  /** A starting field to header mapping. When non-empty it replaces the auto-match. */
  mapping?: Partial<Record<SourceKey<TRecord>, string>>;
  /** Reshapes a mapped row before the schema sees it. */
  transform?: CsvTransform;
  /** Rows created at once. Default 100. */
  batchSize?: number;
  /** The Import button's text. */
  label?: string;
  /** The Import button's icon. */
  icon?: ReactNode;
  /** The resource to create into. Defaults to the ambient resource. */
  resource?: string;
  onComplete?: (report: CsvImportReport) => void;
  onError?: (error: Error) => void;
  /** Rendered inside the context, so a child can call `useCsvImport()`. */
  children?: ReactNode;
}

const defaultIcon = <Upload />;

/**
 * A button that opens a four-step dialog: upload a CSV file, map its columns to
 * the resource's fields, preview the rows the schema accepts, then create them
 * with `dataProvider.create`. Needs the optional `papaparse` peer.
 */
export function CsvImport<TRecord = LooseRecord>({
  schema,
  fields,
  requiredFields,
  mapping,
  transform,
  batchSize,
  label,
  icon = defaultIcon,
  resource: resourceProp,
  onComplete,
  onError,
  children,
}: CsvImportProps<TRecord>) {
  const translate = useTranslate();
  const dataProvider = useDataProvider();
  const ambient = useResourceContext();
  const resource = resourceProp ?? ambient;
  if (!resource) {
    throw new Error(
      "<CsvImport> needs a resource: pass `resource` or render it inside a resource context",
    );
  }

  // Callbacks go through a ref so a new function each render neither rebuilds
  // the controller nor changes what a running import calls when it finishes.
  const latest = useRef({ onComplete, onError, transform });
  latest.current = { onComplete, onError, transform };

  // The schema, fields, mapping and batch size are read when the controller is
  // built, which happens again only for another resource or data provider.
  // biome-ignore lint/correctness/useExhaustiveDependencies(schema): see above
  // biome-ignore lint/correctness/useExhaustiveDependencies(fields): see above
  // biome-ignore lint/correctness/useExhaustiveDependencies(requiredFields): see above
  // biome-ignore lint/correctness/useExhaustiveDependencies(mapping): see above
  // biome-ignore lint/correctness/useExhaustiveDependencies(batchSize): see above
  const controller = useMemo(
    () =>
      createCsvImportController({
        dataProvider,
        resource,
        ...(schema && { schema }),
        ...(fields && { fields }),
        ...(requiredFields && { requiredFields }),
        ...(mapping && { mapping }),
        ...(batchSize !== undefined && { batchSize }),
        transform: (row: CsvRow, index: number) =>
          latest.current.transform?.(row, index) ?? row,
        onComplete: (report) => latest.current.onComplete?.(report),
        onError: (error) => latest.current.onError?.(error),
      }),
    [dataProvider, resource],
  );
  useEffect(() => () => controller.reset(), [controller]);

  const state = useSyncExternalStore(
    controller.store.subscribe,
    controller.store.getSnapshot,
    controller.store.getSnapshot,
  );

  const [open, setOpen] = useState(false);

  const value = useMemo(
    () => ({
      state,
      loadParsed: controller.loadParsed,
      setMapping: controller.setMapping,
      next: controller.next,
      back: controller.back,
      cancel: controller.cancel,
      reset: controller.reset,
    }),
    [state, controller],
  );

  return (
    <CsvImportContext.Provider value={value}>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) controller.reset();
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            {icon}
            {label ?? translate("ra.csv_import.import", { _: "Import" })}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <CsvImportSteps onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
      {children}
    </CsvImportContext.Provider>
  );
}

function CsvImportSteps({ onClose }: { onClose: () => void }) {
  const translate = useTranslate();
  // Held here so it survives Back from the map step.
  const [notice, setNotice] = useState<UploadNotice>(null);
  const { state, next, back, reset } = useCsvImport();
  const { step, status } = state;
  const busy = status === "running";

  const titles = {
    upload: translate("ra.csv_import.step.upload", { _: "Upload" }),
    map: translate("ra.csv_import.step.map", { _: "Map columns" }),
    preview: translate("ra.csv_import.step.preview", { _: "Preview" }),
    commit: translate("ra.csv_import.step.commit", { _: "Importing" }),
  };

  const nextDisabled =
    busy ||
    (step === "upload" &&
      (state.rows.length === 0 || state.parseError !== null)) ||
    (step === "map" && !state.requiredFields.every((f) => state.mapping[f])) ||
    (step === "preview" && !state.validations.some((v) => v.ok));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{titles[step]}</DialogTitle>
      </DialogHeader>
      <div className="min-h-32">
        {step === "upload" && (
          <UploadStep notice={notice} setNotice={setNotice} />
        )}
        {step === "map" && <MapStep />}
        {step === "preview" && <PreviewStep />}
        {step === "commit" && <CommitStep />}
      </div>
      <DialogFooter>
        {step === "commit" ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {translate("ra.csv_import.close", { _: "Close" })}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy || step === "upload"}
              onClick={back}
            >
              {translate("ra.csv_import.back", { _: "Back" })}
            </Button>
            <Button
              type="button"
              disabled={nextDisabled}
              onClick={() => void next()}
            >
              {translate("ra.csv_import.next", { _: "Next" })}
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}

function UploadStep({
  notice,
  setNotice,
}: {
  notice: UploadNotice;
  setNotice: (notice: UploadNotice) => void;
}) {
  const translate = useTranslate();
  const { state, loadParsed } = useCsvImport();

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      try {
        const text = await readText(file);
        setNotice(text.includes(REPLACEMENT_CHAR) ? "not_utf8" : null);
        loadParsed(parseCsvWith(Papa, text), file.name);
      } catch (thrown) {
        setNotice(null);
        loadParsed(
          {
            headers: [],
            rows: [],
            errors: [
              {
                code: "ReadError",
                message:
                  thrown instanceof Error ? thrown.message : String(thrown),
              },
            ],
          },
          file.name,
        );
      }
    },
    [loadParsed, setNotice],
  );
  // The dropzone hands onDrop only the files it accepts. With `multiple: false`
  // it keeps the first of several valid files and rejects the rest as
  // `too-many-files`, which is not a wrong file type.
  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      if (
        rejections.some(({ errors }) =>
          errors.some(({ code }) => code === ErrorCode.FileInvalidType),
        )
      ) {
        setNotice("wrong_file");
      }
    },
    [setNotice],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"] },
    multiple: false,
    onDrop,
    onDropRejected,
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground data-[active=true]:border-primary"
        data-active={isDragActive}
      >
        <input {...getInputProps()} data-testid="csv-file-input" />
        <Upload className="size-5" aria-hidden="true" />
        <p>
          {translate("ra.csv_import.drop", {
            _: "Drop a CSV file here, or click to choose one",
          })}
        </p>
        {state.fileName && <p className="font-medium">{state.fileName}</p>}
      </div>
      {notice === "wrong_file" && (
        <p role="alert" className="text-sm text-destructive">
          {translate("ra.csv_import.wrong_file", {
            _: "Choose a .csv file",
          })}
        </p>
      )}
      {notice === "not_utf8" && (
        <p role="status" className="text-sm text-destructive">
          {translate("ra.csv_import.not_utf8", {
            _: "This file is not UTF-8, so some letters may be wrong. Save it as CSV UTF-8 and try again.",
          })}
        </p>
      )}
      {state.parseError !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {state.parseError}
        </p>
      ) : (
        state.rows.length > 0 && (
          <p className="text-sm">
            {translate("ra.csv_import.rows_parsed", {
              _: "{count} rows parsed",
              count: state.rows.length,
            })}
          </p>
        )
      )}
    </div>
  );
}

function MapStep() {
  const translate = useTranslate();
  const { state, setMapping } = useCsvImport();
  const unmapped = state.requiredFields.some((f) => !state.mapping[f]);
  const idPrefix = useId();

  return (
    <div className="flex flex-col gap-3">
      {state.fields.map((field) => {
        const required = state.requiredFields.includes(field);
        return (
          <div
            key={field}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <label htmlFor={`${idPrefix}${field}`}>
              {field}
              {required && (
                <span className="ml-1 text-destructive" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            <NativeSelect
              id={`${idPrefix}${field}`}
              data-csv-field={field}
              required={required}
              value={state.mapping[field] ?? ""}
              onChange={(e) => setMapping(field, e.target.value)}
            >
              <option value="">
                {translate("ra.csv_import.unmapped", { _: "Not mapped" })}
              </option>
              {state.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </NativeSelect>
          </div>
        );
      })}
      {unmapped && (
        <p role="status" className="text-sm text-destructive">
          {translate("ra.csv_import.required_unmapped", {
            _: "Required fields are not mapped",
          })}
        </p>
      )}
    </div>
  );
}

const cell = (value: unknown) =>
  value == null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

function PreviewStep() {
  const translate = useTranslate();
  const { state } = useCsvImport();
  const { validations, fields } = state;
  const valid = validations.filter((v) => v.ok).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        {translate("ra.csv_import.preview_summary", {
          _: "{valid} valid · {errors} errors · {total} total",
          valid,
          errors: validations.length - valid,
          total: validations.length,
        })}
      </p>
      <div className="max-h-72 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((field) => (
                <TableHead key={field}>{field}</TableHead>
              ))}
              <TableHead>
                {translate("ra.csv_import.issues", { _: "Issues" })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validations.slice(0, PREVIEW_ROWS).map((validation, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity beyond their place in the file
              <TableRow key={index}>
                {fields.map((field) => (
                  <TableCell key={field}>
                    {cell(validation.row[field])}
                  </TableCell>
                ))}
                <TableCell className="text-destructive">
                  {validation.ok ? "" : validation.issues.join("; ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

const percent = ({ progress }: CsvImportState) =>
  progress.total === 0
    ? 0
    : Math.round((progress.current / progress.total) * 100);

function CommitStep() {
  const translate = useTranslate();
  const { state } = useCsvImport();
  const { status, report, error } = state;

  if (status === "failed") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error?.message}
      </p>
    );
  }
  if (status !== "done" || !report) {
    return <Progress value={percent(state)} />;
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="font-medium">
        {translate("ra.csv_import.complete", { _: "Import complete" })}
      </p>
      <p>
        {translate("ra.csv_import.counts", {
          _: "{created} created · {failed} failed · {total} total",
          created: report.created,
          failed: report.failed,
          total: report.total,
        })}
      </p>
      {report.errors.length > 0 && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() =>
            downloadCSV(recordsToCSV(csvErrorRows(report)), "import-errors")
          }
        >
          {translate("ra.csv_import.download_errors", {
            _: "Download error report",
          })}
        </Button>
      )}
    </div>
  );
}
