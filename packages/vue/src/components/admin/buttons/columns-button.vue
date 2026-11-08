<script lang="ts">
/** Props for {@link ColumnsButton}. */
export interface ColumnsButtonProps {
  /** The resource whose table to control. Defaults to the ambient resource. */
  resource?: string;
  /** The store key the table reads its choice from. Defaults to `"<resource>.datatable"`. */
  storeKey?: string;
  /** Extra CSS class appended to the trigger. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ColumnsButton>` — pick and order the columns of a `<DataTable>`. The Vue
 * twin of `@chelone/react`'s `buttons/columns-button.tsx`: a menu with a switch
 * per column, move up / move down buttons and a reset. The choice lives in the
 * store under the table's key, so it survives a reload. Disabled until a
 * `<DataTable>` publishes its columns.
 *
 * The panel holds plain rows, not menu items: an item closes the menu on every
 * click, and switching several columns should not reopen it each time.
 *
 * @example
 * <ColumnsButton />
 */

import { defaultDataTableStoreKey } from "@chelone/core";
import { computed } from "vue";
import { useCheloneStore } from "../../../context";
import { useTranslate } from "../../../i18n/use-translate";
import { useDataTableColumns } from "../../../list/use-data-table-columns";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import FieldsSelector from "./fields-selector.vue";
import { ColumnsIcon } from "./icons";

const props = defineProps<ColumnsButtonProps>();

useCheloneStore();
const resource = useResourceContext({ resource: props.resource });
const noResourceMessage =
  "ColumnsButton: no resource. Pass a `resource` or `storeKey` prop or render inside a <Resource>.";
if (!resource && !props.storeKey) {
  throw new Error(noResourceMessage);
}

const translate = useTranslate();

const resolvedStoreKey = computed(() => {
  if (props.storeKey !== undefined) {
    return props.storeKey;
  }
  if (!resource) {
    throw new Error(noResourceMessage);
  }
  return defaultDataTableStoreKey(resource);
});

const state = useDataTableColumns({ storeKey: resolvedStoreKey });
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button
        variant="outline"
        :disabled="state.columns.value.length === 0"
        :class="props.class"
        data-slot="columns-button"
      >
        <ColumnsIcon />
        {{ translate("chelone.action.select_columns", { _: "Columns" }) }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-64 p-2">
      <FieldsSelector :store-key="resolvedStoreKey" :resource="resource" />
    </DropdownMenuContent>
  </DropdownMenu>
</template>
