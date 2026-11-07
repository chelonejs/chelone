<script lang="ts">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { SourceInputProps } from "./source-input-props";

/** Props for {@link RatingInput}. */
export interface RatingInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  /** Number of whole stars (default 5). */
  max?: number;
  /** Allow half-star granularity (doubles the clickable steps). */
  allowHalf?: boolean;
  disabled?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<RatingInput>` — N-star rating for a `number` value (0..max), the Vue analog
 * of `@chelone/react`'s `inputs/rating-input.tsx`. Optional half-step
 * granularity. Keyboard/AT accessible: a `role="radiogroup"` wraps one
 * `button[role="radio"]` per step, each reporting `aria-checked`. Uses a native
 * `<fieldset>` / `<legend>` for the label + `<FieldError>` for the error slot.
 */

import { toNumberValue } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { FieldError } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

// Explicit `undefined` default disables Vue's absent-Boolean cast of the
// `string | false` `label` prop (else absent → `false` hides the fallback).
const props = withDefaults(defineProps<RatingInputProps>(), {
  label: undefined,
});

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

const max = computed(() => props.max ?? 5);
const steps = computed(() => (props.allowHalf ? max.value * 2 : max.value));
const stepValue = computed(() => (props.allowHalf ? 0.5 : 1));
const currentValue = computed(() => toNumberValue(value.value) ?? 0);
const stars = computed(() =>
  Array.from({ length: steps.value }, (_, i) => {
    const v = (i + 1) * stepValue.value;
    // With half steps a star is two buttons, each drawing its half.
    const half: "left" | "right" | undefined = props.allowHalf ? (v % 1 !== 0 ? "left" : "right") : undefined;
    return { v, selected: currentValue.value >= v, half };
  }),
);

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

function pick(v: number) {
  if (props.disabled) return;
  setValue(v);
}

const starPoints = "12 2 15 9 22 9 16 14 18 22 12 17 6 22 8 14 2 9 9 9";
const viewBoxes = { left: "0 0 12 24", right: "12 0 12 24" };
</script>

<template>
  <fieldset
    :class="props.class"
    :data-invalid="invalid || undefined"
    data-slot="field-set"
    class="flex flex-col gap-3 border-0 p-0"
  >
    <legend
      v-if="labelText != null"
      class="mb-3 text-sm font-medium leading-none"
      data-slot="field-legend"
    >
      {{ labelText }}<span v-if="isRequired"> *</span>
    </legend>
    <div
      :id="id"
      role="radiogroup"
      :aria-disabled="disabled || undefined"
      :aria-invalid="invalid || undefined"
      class="flex items-center"
      :class="allowHalf ? '' : 'gap-1'"
    >
      <button
        v-for="star in stars"
        :key="star.v"
        type="button"
        role="radio"
        :aria-checked="star.selected"
        :aria-disabled="disabled || undefined"
        :disabled="disabled"
        class="py-0.5 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="[
          star.half === 'left' ? 'pl-0.5' : '',
          star.half === 'right' ? 'pr-0.5 mr-1' : '',
          star.half === undefined ? 'px-0.5' : '',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ]"
        @click="pick(star.v)"
        @blur="blur"
      >
        <svg
          :width="star.half ? 10 : 20"
          height="20"
          :viewBox="star.half ? viewBoxes[star.half] : '0 0 24 24'"
          stroke="currentColor"
          stroke-width="1.5"
          :fill="star.selected ? 'currentColor' : 'none'"
          class="text-yellow-500"
          aria-hidden="true"
        >
          <polygon :points="starPoints" />
        </svg>
      </button>
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </fieldset>
</template>
