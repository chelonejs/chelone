<script lang="ts">
import type { Exporter } from "@chelone/core";

/** Props for {@link ExportButton}. */
export interface ExportButtonProps {
  /** Custom exporter; defaults to the built-in CSV writer. */
  exporter?: Exporter;
  /** Max rows fetched for the export. Default `1000`. */
  maxResults?: number;
  /** Passed to `dataProvider.getList` as `meta`. */
  meta?: unknown;
  /** Override the ambient `<Resource>`. */
  resource?: string;
  /** Override the auto-translated label. */
  label?: string;
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ExportButton>` — exports the current list (honoring the ambient filter +
 * primary sort) to a file. The Vue twin of `@chelone/react`'s
 * `buttons/export-button.tsx`, rebridged: chelone's list context has NO
 * `getData` / `exporter` fields, so this fetches the page-set itself via
 * `dataProvider.getList(resource, { sort, filter, pagination })` — reading the
 * ambient `sort` / `filter` / `total` off `useListContext` — then runs the
 * `exporter` (a custom `exporter` prop, else the built-in {@link defaultExporter}
 * CSV writer). Disabled when the list is empty (`total === 0`). Use in the list
 * actions toolbar.
 */

import { computed } from "vue";
import { useCheloneNotifications, useCheloneContext } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import { DEFAULT_EXPORT_MAX_RESULTS, defaultExporter } from "@chelone/core";
import { DownloadIcon } from "./icons";

const props = defineProps<ExportButtonProps>();

const ambientResource = useResourceContext(props);
if (!ambientResource) {
  throw new Error(
    "<ExportButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const resource: string = ambientResource;
const list = useListContext();
const { dataProvider } = useCheloneContext();
const notifications = useCheloneNotifications();
const translate = useTranslate();

const label = computed(() =>
  translate("chelone.action.export", { _: props.label ?? "Export" }),
);
const disabled = computed(() => list.total === 0);

async function onClick(): Promise<void> {
  const exporter = props.exporter ?? defaultExporter;
  try {
    const { data } = await dataProvider.getList(resource, {
      sort: list.sort?.[0],
      filter: list.filter ?? {},
      pagination: { page: 1, perPage: props.maxResults ?? DEFAULT_EXPORT_MAX_RESULTS },
      meta: props.meta,
    });
    await exporter(data, dataProvider, resource);
  } catch (error) {
    console.error(error);
    notifications?.notify("chelone.notification.http_error", { type: "error" });
  }
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    :disabled="disabled"
    :class="props.class ?? 'cursor-pointer'"
    :aria-label="label"
    data-slot="export-button"
    @click="onClick"
  >
    <DownloadIcon />
    {{ label }}
  </Button>
</template>
