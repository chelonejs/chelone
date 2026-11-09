<script lang="ts">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { SourceInputProps } from "./source-input-props";

/**
 * Storage shape a `<WebhookEndpointInput>` edits. Mirrors the React twin's
 * inlined type (the shadmin source imported it from a sibling field not yet
 * ported). Re-exported for typing form values.
 */
export interface WebhookEndpoint {
  url: string;
  secret: string;
  eventTypes: readonly string[];
  lastDelivery?: {
    status: "ok" | "failed" | "pending";
    at: string;
  };
}

/** Props for {@link WebhookEndpointInput}. */
export interface WebhookEndpointInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  /** Available event-type strings to surface as checkboxes. */
  eventTypes: readonly string[];
  /** Optional test-ping handler. When set, renders the test-ping button. */
  onTestPing?: (url: string, secret: string) => Promise<void> | void;
  isRequired?: boolean;
  id?: string;
  disabled?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<WebhookEndpointInput>` — composite input for a webhook endpoint, the Vue
 * analog of `@chelone/react`'s `inputs/webhook-endpoint-input.tsx`. Edits the
 * URL, signing secret, and event-type subscriptions of a single `useInput`-bound
 * `{ url, secret, eventTypes, lastDelivery? }` value, with an optional test-ping
 * button. Normalizes against a partial/nullish stored value so the composite
 * render never dereferences a missing sub-field.
 */

import { toWebhookValue, type WebhookValue } from "@chelone/core";
import { computed, ref } from "vue";
import { useInput } from "../../../form/use-input";
import Button from "../../ui/button.vue";
import Checkbox from "../../ui/checkbox.vue";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

// Explicit `undefined` default disables Vue's absent-Boolean cast of the
// `string | false` `label` prop (else absent → `false` hides the fallback).
const props = withDefaults(defineProps<WebhookEndpointInputProps>(), {
  label: undefined,
});

const DEFAULT_VALUE: WebhookEndpoint = { url: "", secret: "", eventTypes: [] };
// vue-tsc 3.3 mangles a `//` in a static component prop, so this binds from here.
const URL_PLACEHOLDER = "https://example.com/webhook";

const {
  id,
  value: current,
  setValue,
  blur,
  error,
  touched,
  isRequired,
} = useInput<unknown, string, WebhookValue>({ // type-escape: context: no record, so the record-free form is the sentinel `SourcePath` and `SourceValue` test for
  source: props.source,
  defaultValue: props.defaultValue ?? DEFAULT_VALUE,
  validate: props.validate,
  isRequired: props.isRequired,
  id: props.id,
  // Keep the object so the render fills in what a partial or null value lacks
  // (the default format would turn a null into `''`).
  format: toWebhookValue,
});

const pinging = ref(false);

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

function update(patch: Partial<WebhookValue>) {
  setValue({ ...current.value, ...patch });
}

function toggleEvent(event: string, checked: boolean) {
  const set = new Set(current.value.eventTypes);
  if (checked) set.add(event);
  else set.delete(event);
  update({ eventTypes: Array.from(set) });
}

async function handlePing() {
  if (!props.onTestPing) return;
  pinging.value = true;
  try {
    await props.onTestPing(current.value.url, current.value.secret);
  } finally {
    pinging.value = false;
  }
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div class="flex flex-col gap-3">
      <Input
        :id="id"
        type="url"
        data-webhook-url
        :model-value="current.url"
        :disabled="disabled"
        :aria-invalid="invalid"
        :placeholder="URL_PLACEHOLDER"
        @update:model-value="update({ url: $event })"
        @blur="blur"
      />
      <Input
        type="password"
        data-webhook-secret
        aria-label="Signing secret"
        :model-value="current.secret"
        :disabled="disabled"
        placeholder="Signing secret"
        @update:model-value="update({ secret: $event })"
      />
      <div class="flex flex-wrap gap-3">
        <label
          v-for="event in eventTypes"
          :key="event"
          :for="`webhook-event-${event}`"
          class="flex items-center gap-2 font-mono text-sm"
        >
          <Checkbox
            :id="`webhook-event-${event}`"
            data-event-checkbox
            :model-value="current.eventTypes.includes(event)"
            :disabled="disabled"
            @update:model-value="toggleEvent(event, $event)"
          />
          {{ event }}
        </label>
      </div>
      <Button
        v-if="onTestPing"
        type="button"
        variant="outline"
        data-test-ping-button
        :disabled="disabled || pinging || !current.url"
        @click="handlePing"
      >
        {{ pinging ? "Pinging…" : "Send test ping" }}
      </Button>
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
