<script lang="ts" generic="TRecord = LooseRecord">
import type {
  CsvImportOptions,
  CsvImportReport,
  CsvTransform,
  LooseRecord,
  SourceKey,
} from "@chelone/core";

/** Props for {@link CsvImport}. */
export interface CsvImportProps<TRecord = LooseRecord> {
  /** A Standard Schema (zod, valibot, ...). Its keys are the fields; its non-optional keys are required. */
  schema?: CsvImportOptions<TRecord>["schema"];
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
  /** The resource to create into. Defaults to the ambient resource. */
  resource?: string;
  onComplete?: (report: CsvImportReport) => void;
  onError?: (error: Error) => void;
}
</script>

<script setup lang="ts" generic="TRecord = LooseRecord">
/**
 * `<CsvImport>` — a button that opens a four-step sheet: upload a CSV file, map
 * its columns to the resource's fields, preview the rows the schema accepts,
 * then create them with `dataProvider.create`. The Vue twin of
 * `@chelone/react`'s `csv-import/csv-import.tsx` on the same core controller.
 * Needs the optional `papaparse` peer.
 *
 * Divergences from the React twin: `@chelone/vue` has no dialog primitive, so
 * the wizard is a right-hand `<Sheet>`; `react-dropzone` is React-only, so the
 * upload step is a native file input with drag-and-drop on its wrapper; the
 * button icon is the `icon` slot; and the resource, data provider, schema,
 * fields, mapping and batch size are read once when the component is set up.
 * The default slot renders inside the provided context, so a child can call
 * `useCsvImport()`.
 */

import {
  createCsvImportController,
  csvErrorRows,
  downloadCSV,
  parseCsvWith,
  PREVIEW_ROWS,
  REPLACEMENT_CHAR,
  recordsToCSV,
} from "@chelone/core";
import type { CsvImportState, CsvRow } from "@chelone/core";
import Papa from "papaparse";
import { computed, onScopeDispose, provide, ref } from "vue";
import { useCheloneContext } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { useResourceContext } from "../../../resource-context";
import { useMicroStore } from "../../../store/use-micro-store";
import LinearProgress from "../feedback/linear-progress.vue";
import Button from "../../ui/button.vue";
import NativeSelect from "../../ui/native-select.vue";
import Sheet from "../../ui/sheet.vue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { UploadIcon } from "./upload-icon";
import { CsvImportKey, type CsvImportContextValue } from "./use-csv-import";

const props = defineProps<CsvImportProps<TRecord>>();

const translate = useTranslate();
const { dataProvider } = useCheloneContext();
const resource = useResourceContext(props);
if (!resource) {
  throw new Error(
    "<CsvImport> needs a resource: pass `resource` or render it inside a resource context",
  );
}

// Callbacks and the transform are read off the props when they run, so a new
// function between renders changes what a running import calls.
const controller = createCsvImportController({
  dataProvider,
  resource,
  ...(props.schema && { schema: props.schema }),
  ...(props.fields && { fields: props.fields }),
  ...(props.requiredFields && { requiredFields: props.requiredFields }),
  ...(props.mapping && { mapping: props.mapping }),
  ...(props.batchSize !== undefined && { batchSize: props.batchSize }),
  transform: (row: CsvRow, index: number) =>
    props.transform?.(row, index) ?? row,
  onComplete: (report) => props.onComplete?.(report),
  onError: (error) => props.onError?.(error),
});
onScopeDispose(() => controller.reset());

const state = useMicroStore(controller.store);

const context: CsvImportContextValue = {
  state,
  loadParsed: controller.loadParsed,
  setMapping: controller.setMapping,
  next: controller.next,
  back: controller.back,
  cancel: controller.cancel,
  reset: controller.reset,
};
provide(CsvImportKey, context);

const open = ref(false);

// What the upload step tells the user beside the file's own parse result.
const notice = ref<"wrong_file" | "not_utf8" | null>(null);

function onOpenChange(next: boolean) {
  open.value = next;
  if (!next) {
    controller.reset();
    notice.value = null;
  }
}

function onClose() {
  controller.reset();
  notice.value = null;
  open.value = false;
}

const busy = computed(() => state.value.status === "running");

const titles = computed(() => ({
  upload: translate("chelone.csv_import.step.upload", { _: "Upload" }),
  map: translate("chelone.csv_import.step.map", { _: "Map columns" }),
  preview: translate("chelone.csv_import.step.preview", { _: "Preview" }),
  commit: translate("chelone.csv_import.step.commit", { _: "Importing" }),
}));

const nextDisabled = computed(() => {
  const { step, rows, parseError, requiredFields, mapping, validations } =
    state.value;
  return (
    busy.value ||
    (step === "upload" && (rows.length === 0 || parseError !== null)) ||
    (step === "map" && !requiredFields.every((f) => mapping[f])) ||
    (step === "preview" && !validations.some((v) => v.ok))
  );
});

// Upload step.

// FileReader rather than Blob.text(), which jsdom does not implement.
const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsText(file);
  });

async function loadFile(file: File) {
  try {
    const text = await readText(file);
    notice.value = text.includes(REPLACEMENT_CHAR) ? "not_utf8" : null;
    controller.loadParsed(parseCsvWith(Papa, text), file.name);
  } catch (thrown) {
    notice.value = null;
    controller.loadParsed(
      {
        headers: [],
        rows: [],
        errors: [
          {
            code: "ReadError",
            message: thrown instanceof Error ? thrown.message : String(thrown),
          },
        ],
      },
      file.name,
    );
  }
}

const fileInput = ref<HTMLInputElement | null>(null);
const dragging = ref(false);

function onFileChange(event: Event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const file = input.files?.[0];
  if (file) void loadFile(file);
  // Allow choosing the same file again.
  input.value = "";
}

// A native drop is not filtered by `accept`, as a dropzone's is.
const isCsv = (file: File) =>
  /\.csv$/i.test(file.name) || file.type === "text/csv";

function onDrop(event: DragEvent) {
  dragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  if (isCsv(file)) void loadFile(file);
  else notice.value = "wrong_file";
}

// Map step.

const unmapped = computed(() =>
  state.value.requiredFields.some((f) => !state.value.mapping[f]),
);

const headerOptions = computed(() => [
  {
    value: "",
    label: translate("chelone.csv_import.unmapped", { _: "Not mapped" }),
  },
  ...state.value.headers.map((header) => ({ value: header, label: header })),
]);

// Preview step.

const cell = (value: unknown) =>
  value == null
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

const validCount = computed(
  () => state.value.validations.filter((v) => v.ok).length,
);

// Commit step.

const percent = (s: CsvImportState) =>
  s.progress.total === 0
    ? 0
    : Math.round((s.progress.current / s.progress.total) * 100);

function downloadErrors() {
  const report = state.value.report;
  if (!report) return;
  downloadCSV(
    recordsToCSV(csvErrorRows(report)),
    "import-errors",
  );
}
</script>

<template>
  <Button type="button" variant="outline" @click="open = true">
    <slot name="icon"><UploadIcon /></slot>
    {{ label ?? translate("chelone.csv_import.import", { _: "Import" }) }}
  </Button>
  <Sheet
    :open="open"
    side="right"
    class="w-full sm:max-w-2xl"
    :title="titles[state.step]"
    @update:open="onOpenChange"
  >
    <div class="min-h-32">
      <div v-if="state.step === 'upload'" class="flex flex-col gap-3">
        <div
          data-slot="csv-import-dropzone"
          :data-active="dragging"
          class="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground data-[active=true]:border-primary"
          @click="fileInput?.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            class="hidden"
            data-testid="csv-file-input"
            @click.stop
            @change="onFileChange"
          />
          <UploadIcon />
          <p>
            {{
              translate("chelone.csv_import.drop", {
                _: "Drop a CSV file here, or click to choose one",
              })
            }}
          </p>
          <p v-if="state.fileName" class="font-medium">{{ state.fileName }}</p>
        </div>
        <p v-if="notice === 'wrong_file'" role="alert" class="text-sm text-destructive">
          {{ translate("chelone.csv_import.wrong_file", { _: "Choose a .csv file" }) }}
        </p>
        <p v-if="notice === 'not_utf8'" role="status" class="text-sm text-destructive">
          {{
            translate("chelone.csv_import.not_utf8", {
              _: "This file is not UTF-8, so some letters may be wrong. Save it as CSV UTF-8 and try again.",
            })
          }}
        </p>
        <p
          v-if="state.parseError !== null"
          role="alert"
          class="text-sm text-destructive"
        >
          {{ state.parseError }}
        </p>
        <p v-else-if="state.rows.length > 0" class="text-sm">
          {{
            translate("chelone.csv_import.rows_parsed", {
              _: "{count} rows parsed",
              count: state.rows.length,
            })
          }}
        </p>
      </div>

      <div v-else-if="state.step === 'map'" class="flex flex-col gap-3">
        <div
          v-for="field in state.fields"
          :key="field"
          class="flex items-center justify-between gap-4 text-sm"
        >
          <label :for="`csv-import-${field}`">
            {{ field }}
            <span
              v-if="state.requiredFields.includes(field)"
              class="ml-1 text-destructive"
              aria-hidden="true"
              >*</span
            >
          </label>
          <NativeSelect
            :id="`csv-import-${field}`"
            :data-csv-field="field"
            :model-value="state.mapping[field] ?? ''"
            :options="headerOptions"
            @update:model-value="controller.setMapping(field, $event)"
          />
        </div>
        <p v-if="unmapped" role="status" class="text-sm text-destructive">
          {{
            translate("chelone.csv_import.required_unmapped", {
              _: "Required fields are not mapped",
            })
          }}
        </p>
      </div>

      <div v-else-if="state.step === 'preview'" class="flex flex-col gap-3">
        <p class="text-sm">
          {{
            translate("chelone.csv_import.preview_summary", {
              _: "{valid} valid · {errors} errors · {total} total",
              valid: validCount,
              errors: state.validations.length - validCount,
              total: state.validations.length,
            })
          }}
        </p>
        <div class="max-h-72 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead v-for="field in state.fields" :key="field">{{
                  field
                }}</TableHead>
                <TableHead>{{
                  translate("chelone.csv_import.issues", { _: "Issues" })
                }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(validation, index) in state.validations.slice(
                  0,
                  PREVIEW_ROWS,
                )"
                :key="index"
              >
                <TableCell v-for="field in state.fields" :key="field">{{
                  cell(validation.row[field])
                }}</TableCell>
                <TableCell class="text-destructive">{{
                  validation.ok ? "" : validation.issues.join("; ")
                }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div v-else>
        <p
          v-if="state.status === 'failed'"
          role="alert"
          class="text-sm text-destructive"
        >
          {{ state.error?.message }}
        </p>
        <LinearProgress
          v-else-if="state.status !== 'done' || !state.report"
          :timeout="0"
          :value="percent(state)"
        />
        <div v-else class="flex flex-col gap-3 text-sm">
          <p class="font-medium">
            {{ translate("chelone.csv_import.complete", { _: "Import complete" }) }}
          </p>
          <p>
            {{
              translate("chelone.csv_import.counts", {
                _: "{created} created · {failed} failed · {total} total",
                created: state.report.created,
                failed: state.report.failed,
                total: state.report.total,
              })
            }}
          </p>
          <Button
            v-if="state.report.errors.length > 0"
            type="button"
            variant="outline"
            class="self-start"
            @click="downloadErrors"
          >
            {{
              translate("chelone.csv_import.download_errors", {
                _: "Download error report",
              })
            }}
          </Button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button v-if="state.step === 'commit'" type="button" :disabled="busy" @click="onClose">
          {{ translate("chelone.csv_import.close", { _: "Close" }) }}
        </Button>
        <template v-else>
          <Button
            type="button"
            variant="outline"
            :disabled="busy || state.step === 'upload'"
            @click="controller.back()"
          >
            {{ translate("chelone.csv_import.back", { _: "Back" }) }}
          </Button>
          <Button type="button" :disabled="nextDisabled" @click="void controller.next()">
            {{ translate("chelone.csv_import.next", { _: "Next" }) }}
          </Button>
        </template>
      </div>
    </template>
  </Sheet>
  <slot />
</template>
