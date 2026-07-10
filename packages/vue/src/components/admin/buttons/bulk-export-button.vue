<script lang="ts">
import type { Exporter } from "./export";

/** Props for {@link BulkExportButton}. */
export interface BulkExportButtonProps {
  /** Custom exporter; defaults to the built-in CSV writer. */
  exporter?: Exporter;
  /** Passed to `dataProvider.getMany` as `meta`. */
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
 * `<BulkExportButton>` — exports the SELECTED rows to a file. The Vue twin of
 * `@chelone/react`'s `buttons/bulk-export-button.tsx`, rebridged: ra-core's
 * `useBulkExport` hook has no chelone equivalent, so this fetches the selected
 * records itself via `dataProvider.getMany(resource, { ids: selectedIds })`
 * (reading `selectedIds` off `useListContext`) and runs the `exporter` (a custom
 * `exporter` prop, else the built-in {@link defaultExporter} CSV writer). Use
 * inside a `<DataTable :bulk-actions>` / `<BulkActionsToolbar>`.
 */

import { computed } from "vue";
import { useChelonNotifications, useCheloneContext } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import { defaultExporter } from "./export";
import { DownloadIcon } from "./icons";

const props = defineProps<BulkExportButtonProps>();

const resource = useResourceContext(props);
if (!resource) {
  throw new Error(
    "<BulkExportButton> must be used inside a <Resource> or given a `resource` prop.",
  );
}
const list = useListContext();
const { dataProvider } = useCheloneContext();
const notifications = useChelonNotifications();
const translate = useTranslate();

const label = computed(() =>
  translate("ra.action.export", { _: props.label ?? "Export" }),
);

async function onClick(): Promise<void> {
  const exporter = props.exporter ?? defaultExporter;
  try {
    const { data } = await dataProvider.getMany(resource as string, {
      ids: list.selectedIds ?? [],
      meta: props.meta,
    });
    await exporter(data, dataProvider, resource as string);
  } catch (error) {
    console.error(error);
    notifications?.notify("ra.notification.http_error", { type: "error" });
  }
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="sm"
    :class="props.class ?? 'flex items-center gap-2 h-9'"
    :aria-label="label"
    data-slot="bulk-export-button"
    @click="onClick"
  >
    <DownloadIcon />
    {{ label }}
  </Button>
</template>
