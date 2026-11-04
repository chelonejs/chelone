<script lang="ts">
import type { SourceProp, Validator } from "@chelone/core";

/** A subscription plan a {@link SubscriptionPlanPicker} renders as one card. */
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features?: readonly string[];
}

/** Props for {@link SubscriptionPlanPicker}. */
export interface SubscriptionPlanPickerProps {
  /** The FK/field path holding the selected plan id. */
  source: SourceProp;
  /** The plans rendered as cards. */
  plans: readonly SubscriptionPlan[];
  /** Highlights one plan as recommended. */
  recommendedPlanId?: string;
  /** Explicit label, or `false` to hide it. Absent → humanized `source`. */
  label?: string | false;
  /** Helper text under the grid. */
  helperText?: string;
  /** Override the ambient resource (label-key resolution). */
  resource?: string;
  /** ra-contract validators — composed, first error wins. */
  validate?: Validator | readonly Validator[];
  /** Forces the required marker. */
  isRequired?: boolean;
  /** Input-level default value (seeds only into a hole). */
  defaultValue?: unknown;
  /** Disables the whole picker. */
  disabled?: boolean;
  /** Root element class passthrough. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SubscriptionPlanPicker>` — a card-grid plan picker, the Vue analog of
 * `@chelone/react`'s `inputs/subscription-plan-picker.tsx`. One card per `plans`
 * entry; clicking a card (or its button) writes the plan's `id` to the form
 * field via {@link useInput}. The selected plan is highlighted, and an optional
 * `recommendedPlanId` gets a "Recommended" badge. The grid is a
 * `role="radiogroup"`; each card a `role="radio"` with `aria-checked`.
 */

import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { FieldDescription, FieldError } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(defineProps<SubscriptionPlanPickerProps>(), {
  label: undefined,
});

const { id, value, setValue, error, touched, isRequired } = useInput({
  source: props.source,
  validate: props.validate,
  isRequired: props.isRequired,
  defaultValue: props.defaultValue,
});

const invalid = computed(() => touched.value && error.value != null);
const currentId = computed<string | null>(
  () => (value.value as string | null | undefined) ?? null,
);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

function formatPrice(plan: SubscriptionPlan): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: plan.currency,
  }).format(plan.price);
}

function onSelect(plan: SubscriptionPlan) {
  if (!props.disabled) setValue(plan.id);
}
</script>

<template>
  <fieldset
    :class="props.class"
    :data-invalid="invalid || undefined"
    data-slot="subscription-plan-picker"
    class="flex flex-col gap-3"
  >
    <legend v-if="labelText != null" class="text-sm font-medium leading-none">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </legend>
    <div
      :id="id"
      role="radiogroup"
      class="grid gap-3 sm:grid-cols-3"
      :aria-disabled="disabled || undefined"
      :aria-invalid="invalid || undefined"
    >
      <Card
        v-for="plan in plans"
        :key="plan.id"
        :data-plan-card="plan.id"
        :data-selected="currentId === plan.id ? 'true' : 'false'"
        :data-recommended="recommendedPlanId === plan.id ? 'true' : 'false'"
        role="radio"
        :aria-checked="currentId === plan.id"
        :class="
          cn(
            'transition',
            currentId === plan.id && 'border-primary ring-2 ring-primary',
            recommendedPlanId === plan.id &&
              currentId !== plan.id &&
              'border-primary/50',
          )
        "
      >
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>{{ plan.name }}</span>
            <span
              v-if="recommendedPlanId === plan.id"
              class="rounded bg-primary px-2 py-0.5 text-primary-foreground text-xs"
            >
              Recommended
            </span>
          </CardTitle>
          <div class="font-semibold text-2xl tabular-nums">
            {{ formatPrice(plan) }}
            <span class="font-normal text-muted-foreground text-sm">
              /{{ plan.interval }}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ul
            v-if="plan.features"
            class="space-y-1 text-muted-foreground text-sm"
          >
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>
          <Button
            type="button"
            class="mt-4 w-full"
            :variant="currentId === plan.id ? 'default' : 'outline'"
            :disabled="disabled"
            @click="onSelect(plan)"
          >
            {{ currentId === plan.id ? "Current" : "Select" }}
          </Button>
        </CardContent>
      </Card>
    </div>
    <FieldDescription v-if="helperText">{{ helperText }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </fieldset>
</template>
