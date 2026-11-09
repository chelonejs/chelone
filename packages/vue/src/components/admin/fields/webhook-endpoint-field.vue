<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** A webhook delivery outcome. */
export type DeliveryStatus = "ok" | "failed" | "pending";

/** The shape `<WebhookEndpointField>` reads from a record source. */
export interface WebhookEndpoint {
  url: string;
  secret: string;
  eventTypes: readonly string[];
  lastDelivery?: {
    status: DeliveryStatus;
    at: string;
  };
}

/** Props for {@link WebhookEndpointField}. */
export interface WebhookEndpointFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<WebhookEndpointField>` — displays a webhook endpoint's URL and last-delivery
 * status badge, the Vue analog of `@chelone/react`'s
 * `fields/webhook-endpoint-field.tsx`. The signing secret is NEVER rendered. A
 * nullish / non-object value renders nothing (parity with the twin).
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useFieldValue } from "../../../record/use-field-value";

const props = defineProps<WebhookEndpointFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const endpoint = computed<WebhookEndpoint | null>(() => {
  // type-escape: json: a stored endpoint is of an unchecked shape, as in the React twin
  const raw: unknown = value.value;
  // type-escape: json: the object is trusted to be a WebhookEndpoint, as in the React twin
  return raw && typeof raw === "object" ? (raw as WebhookEndpoint) : null;
});

const status = computed<DeliveryStatus>(
  () => endpoint.value?.lastDelivery?.status ?? "pending",
);

const statusClass = computed(() =>
  cn(
    "rounded px-2 py-0.5 text-xs font-medium",
    status.value === "ok" && "bg-green-500/10 text-green-700 dark:text-green-400",
    status.value === "failed" && "bg-red-500/10 text-red-700 dark:text-red-400",
    status.value === "pending" && "bg-muted text-muted-foreground",
  ),
);
</script>

<template>
  <span
    v-if="endpoint"
    data-slot="webhook-endpoint-field"
    :class="cn('inline-flex items-center gap-2', props.class)"
  >
    <span class="font-mono text-sm">{{ endpoint.url }}</span>
    <span
      data-webhook-status
      :data-status="status"
      :class="statusClass"
      >{{ status.toUpperCase() }}</span
    >
  </span>
</template>
