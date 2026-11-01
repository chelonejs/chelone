<script lang="ts">
import type { Identifier, Lock } from "@chelone/core";

/** Props for {@link LockOnMount}. Each defaults to the ambient context. */
export interface LockOnMountProps {
  resource?: string;
  id?: Identifier;
  /** Defaults to the auth provider's identity. */
  identity?: Identifier;
  meta?: Record<string, unknown>;
  /** Called with a failed lock or release, a conflict included. */
  onLockError?: (error: Error) => void;
}
</script>

<script setup lang="ts">
/**
 * `<LockOnMount>` — holds a record's lock while it is mounted. It shows the
 * `#loading` slot (a `Skeleton`) while the lock is requested, the default slot
 * once it is held, and the `#locked-by` slot (an `Alert`) when another
 * identity has it. Any other lock error renders nothing and reaches
 * `onLockError`. Divergence from the React twin: slots stand in for the render
 * props.
 */

import { LockConflictError } from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useLockOnMount } from "../../../realtime/locks";
import { Alert, AlertDescription } from "../../ui/alert";
import Skeleton from "../../ui/skeleton.vue";

const props = defineProps<LockOnMountProps>();

defineSlots<{
  default?: () => unknown;
  loading?: () => unknown;
  "locked-by"?: (props: { lock: Lock }) => unknown;
}>();

const translate = useTranslate();
const { lock, isLocking, lockError } = useLockOnMount({
  resource: () => props.resource,
  id: () => props.id,
  identity: () => props.identity,
  meta: props.meta,
  onLockError: (error) => props.onLockError?.(error),
});

const conflict = computed(() =>
  lockError.value instanceof LockConflictError
    ? lockError.value.existingLock
    : null,
);
</script>

<template>
  <slot v-if="isLocking" name="loading">
    <Skeleton class="h-8 w-full" />
  </slot>
  <slot v-else-if="conflict" name="locked-by" :lock="conflict">
    <Alert>
      <AlertDescription>{{
        translate("chelone.lock.locked_by", {
          _: `Locked by ${String(conflict.identity)}`,
          identity: String(conflict.identity),
        })
      }}</AlertDescription>
    </Alert>
  </slot>
  <slot v-else-if="lock" />
</template>
