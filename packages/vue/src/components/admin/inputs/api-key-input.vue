<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type {
  LooseRecord,
  RecordResources,
  ResourceRecord,
  SourceProp,
} from "@chelone/core";

/** Props for {@link ApiKeyInput}. */
export interface ApiKeyInputProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  /** Record field holding the API key. */
  source: SourceProp<TRecord>;
  /** Override resource. */
  resource?: string;
  /** Async side-effect on rotate. When provided, replaces the default update mutation. */
  onRotate?: (record: TRecord) => Promise<void> | void;
  /** Disable the button. */
  disabled?: boolean;
}
</script>

<script setup lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
/**
 * `<ApiKeyInput>` — API-key rotation control, the Vue analog of
 * `@chelone/react`'s `inputs/api-key-input.tsx`. Renders a single Rotate button
 * that opens a confirmation dialog; on confirm it calls `onRotate(record)` when
 * provided, else dispatches the default update mutation
 * (`useUpdate(resource).mutateAsync({ id, data: { [source]: null }, previousData })`)
 * to trigger server-side regeneration.
 *
 * This input is NOT form-bound — it reads the ambient record + resource and
 * mutates the data provider directly (unlike the `useInput` text inputs). The
 * Vue `ui/` slice ships no reka-ui `AlertDialog`, so the confirm step is a
 * lightweight inline `role="alertdialog"` panel toggled by the trigger.
 */

import { ref } from "vue";
import { useUpdate } from "../../../data/mutations";
import { useRecordContextRef } from "../../../record/record-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";

const props = defineProps<ApiKeyInputProps<TRecord>>();

const record = useRecordContextRef<TRecord>();
const resource = useResourceContext({ resource: props.resource });
// `useUpdate` binds the resource at call time; the dispatch below guards on a
// real record + resource, so an empty-string placeholder is never fired.
const update = useUpdate<RecordResources<TRecord>, string>(resource ?? "");

const open = ref(false);
const pending = ref(false);

async function handleRotate() {
  pending.value = true;
  try {
    const rec = record.value;
    if (props.onRotate && rec) {
      await props.onRotate(rec);
    } else if (rec && resource) {
      await update.mutateAsync({
        id: rec.id,
        // type-escape: builder: `source` is a path of TRecord, so a null written there is a patch of it; the compiler cannot see through a computed key
        data: { [props.source]: null } as Partial<TRecord>,
        previousData: rec,
      });
    }
  } finally {
    pending.value = false;
    open.value = false;
  }
}
</script>

<template>
  <div>
    <Button
      type="button"
      variant="outline"
      data-rotate-button
      :disabled="disabled"
      @click="open = true"
    >
      Rotate
    </Button>
    <div
      v-if="open"
      role="alertdialog"
      aria-modal="true"
      class="mt-2 rounded-md border border-input bg-background p-4"
    >
      <p class="font-semibold">Rotate API key?</p>
      <p class="text-sm text-muted-foreground">
        Are you sure? The current key will be revoked immediately. Any
        integrations still using it will break until they're updated.
      </p>
      <div class="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          data-rotate-cancel
          @click="open = false"
        >
          Cancel
        </Button>
        <Button
          type="button"
          data-rotate-confirm
          :disabled="pending"
          @click="handleRotate"
        >
          {{ pending ? "Rotating…" : "Rotate" }}
        </Button>
      </div>
    </div>
  </div>
</template>
