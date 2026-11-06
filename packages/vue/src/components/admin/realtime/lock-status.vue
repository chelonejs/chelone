<script lang="ts">
import type { Identifier, Lock } from "@chelone/core";
import { defineComponent, h } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useGetLockLive } from "../../../realtime/locks";
import { Badge } from "../../ui/badge";

/** Props for {@link LockStatus}. Each defaults to the ambient context. */
export interface LockStatusProps {
  resource?: string;
  id?: Identifier;
}

/**
 * The query. `useGetLockLive` takes its resource as a plain string, so the
 * parent mounts this only once a resource and an id exist and keys it by
 * resource: a changed resource remounts it instead of reusing a stale query.
 */
const LockStatusQuery = defineComponent({
  props: {
    resource: { type: String, required: true },
    id: { type: [String, Number], required: true },
  },
  setup(props, { slots }) {
    const translate = useTranslate();
    const { data: lock } = useGetLockLive(props.resource, () => ({
      id: props.id,
    }));
    return () => {
      if (lock.value) {
        return (
          slots.lock?.({ lock: lock.value }) ??
          h(Badge, { variant: "secondary" }, () =>
            translate("chelone.lock.locked_by", {
              _: `Locked by ${String(lock.value?.identity)}`,
              identity: String(lock.value?.identity),
            }),
          )
        );
      }
      return lock.value === null ? slots.free?.() : null;
    };
  },
});
</script>

<script setup lang="ts">
/**
 * `<LockStatus>` — who holds a record's lock, kept live. The `#lock` slot
 * replaces the default secondary `Badge`; the `#free` slot renders when the
 * record is free. With no resource or id it fetches nothing and renders
 * nothing. Divergence from the React twin: slots stand in for the render
 * props.
 */

import { computed, inject, type VNode } from "vue";
import { RecordContextKey } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";

const props = defineProps<LockStatusProps>();

defineSlots<{
  lock?: (props: { lock: Lock }) => VNode[];
  free?: () => VNode[];
}>();

const ambientResource = useResourceContext();
const ambientRecord = inject(RecordContextKey, null);

// `??`, not `||`: 0 is an id.
const target = computed(() => {
  const resource = props.resource ?? ambientResource;
  const id = props.id ?? ambientRecord?.value?.id;
  return resource === undefined || id === undefined || id === null
    ? undefined
    : { resource, id };
});
</script>

<template>
  <LockStatusQuery
    v-if="target"
    :key="target.resource"
    :resource="target.resource"
    :id="target.id"
  >
    <template v-if="$slots.lock" #lock="slotProps">
      <slot name="lock" v-bind="slotProps" />
    </template>
    <template v-if="$slots.free" #free>
      <slot name="free" />
    </template>
  </LockStatusQuery>
</template>
