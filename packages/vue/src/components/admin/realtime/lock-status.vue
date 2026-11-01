<script lang="ts">
import type { Identifier, Lock } from "@chelone/core";

/** Props for {@link LockStatus}. Each defaults to the ambient context. */
export interface LockStatusProps {
  resource?: string;
  id?: Identifier;
}
</script>

<script setup lang="ts">
/**
 * `<LockStatus>` — who holds a record's lock, kept live. The `#lock` slot
 * replaces the default secondary `Badge`; the `#free` slot renders when the
 * record is free. With no resource or id it fetches nothing and renders
 * nothing. Divergence from the React twin: slots stand in for the render
 * props.
 */

import { inject } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { RecordContextKey } from "../../../record/record-context";
import { useGetLockLive } from "../../../realtime/locks";
import { useResourceContext } from "../../../resource-context";
import { Badge } from "../../ui/badge";

const props = defineProps<LockStatusProps>();

defineSlots<{
  lock?: (props: { lock: Lock }) => unknown;
  free?: () => unknown;
}>();

const translate = useTranslate();
const ambientResource = useResourceContext();
const ambientRecord = inject(RecordContextKey, null);

const resolvedResource = () => props.resource ?? ambientResource;
// `??`, not `||`: 0 is an id.
const resolvedId = () =>
  props.id ?? (ambientRecord?.value?.id as Identifier | undefined);

const { data: lock } = useGetLockLive(
  resolvedResource() as string,
  () => ({ id: resolvedId() as Identifier }),
  {
    enabled: () => resolvedResource() !== undefined && resolvedId() != null,
  },
);
</script>

<template>
  <slot v-if="lock" name="lock" :lock="lock">
    <Badge variant="secondary">{{
      translate("chelone.lock.locked_by", {
        _: `Locked by ${String(lock.identity)}`,
        identity: String(lock.identity),
      })
    }}</Badge>
  </slot>
  <slot v-else-if="lock === null" name="free" />
</template>
