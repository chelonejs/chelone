<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";
import type { SubscriptionPlan } from "../inputs/subscription-plan-picker.vue";

export type { SubscriptionPlan };

/** Props for {@link SubscriptionPlanField}. */
export interface SubscriptionPlanFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** Available plans to look up by id. */
  plans: readonly SubscriptionPlan[];
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<SubscriptionPlanField>` — displays the current subscription plan as a
 * compact badge (name + price/interval), the Vue analog of `@chelone/react`'s
 * `fields/subscription-plan-field.tsx`. Looks up the plan from the `plans` array
 * by the id at `source`. An unmatched id renders the `empty` fallback (or
 * nothing). Reuses the `SubscriptionPlan` shape from `<SubscriptionPlanPicker>`.
 */

import { computed } from "vue";
import { Badge } from "../../ui/badge";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<SubscriptionPlanFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const plan = computed<SubscriptionPlan | undefined>(() =>
  props.plans.find((p) => p.id === value.value),
);

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

const formatted = computed(() => {
  const p = plan.value;
  if (!p) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: p.currency,
  }).format(p.price);
});
</script>

<template>
  <Badge v-if="plan" variant="secondary" :class="props.class">
    <span class="font-medium">{{ plan.name }}</span>
    <span class="ml-2 text-muted-foreground text-xs"
      >{{ formatted }}/{{ plan.interval }}</span
    >
  </Badge>
  <span
    v-else-if="emptyText != null"
    data-slot="subscription-plan-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
