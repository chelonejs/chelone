<script setup lang="ts">
/**
 * `<DurationInput>` — edits an ISO-8601 duration string (`PT2H30M`, `P1DT4H`)
 * via per-unit numeric boxes, the Vue analog of `@chelone/react`'s
 * `inputs/duration-input.tsx`. Reads the stored string into day/hour/minute/
 * second boxes and writes the recomposed ISO string back (all-empty → `null`).
 */

import type { Validator } from "@chelone/core";
import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { cn } from "../../../lib/utils";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { parseIsoDuration } from "./duration-utils";
import { humanizeSource } from "./label-text";

type Unit = "d" | "h" | "m" | "s";
const UNIT_LABEL: Record<Unit, string> = {
  d: "days",
  h: "hours",
  m: "minutes",
  s: "seconds",
};

const props = withDefaults(
  defineProps<{
    source: string;
    label?: string | false;
    defaultValue?: unknown;
    validate?: Validator | readonly Validator[];
    /** Which units to expose. Default `["d","h","m","s"]`. */
    units?: readonly Unit[];
    disabled?: boolean;
    helperText?: string;
    class?: string;
  }>(),
  // `label: undefined` so an absent `string | false` label isn't coerced to
  // `false` by Vue's Boolean-prop rule (which would suppress the label).
  { units: () => ["d", "h", "m", "s"] as Unit[], label: undefined },
);

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

function seed(v: unknown): Record<Unit, string> {
  const p = parseIsoDuration(String(v ?? "")) ?? {};
  return {
    d: p.days?.toString() ?? "",
    h: p.hours?.toString() ?? "",
    m: p.minutes?.toString() ?? "",
    s: p.seconds?.toString() ?? "",
  };
}

const values = ref<Record<Unit, string>>(seed(value.value));
watch(value, (next) => {
  values.value = seed(next);
});

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);
const labelFor = computed(() =>
  props.units.length > 0 ? `${id}-${props.units[0]}` : id,
);

const inputClass =
  "flex h-9 w-16 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

function writeBack(next: Record<Unit, string>) {
  const dayPart = next.d ? `${+next.d}D` : "";
  const timeParts =
    (next.h ? `${+next.h}H` : "") +
    (next.m ? `${+next.m}M` : "") +
    (next.s ? `${+next.s}S` : "");
  const out =
    dayPart || timeParts
      ? `P${dayPart}${timeParts ? `T${timeParts}` : ""}`
      : "";
  setValue(out || null);
}
function onUnitInput(u: Unit, event: Event) {
  const next = { ...values.value, [u]: (event.target as HTMLInputElement).value };
  values.value = next;
  writeBack(next);
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="labelFor">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div :class="cn('flex items-end gap-2')">
      <label
        v-for="u in props.units"
        :key="u"
        :for="`${id}-${u}`"
        class="flex flex-col items-center text-muted-foreground text-xs"
      >
        <input
          :id="`${id}-${u}`"
          type="number"
          min="0"
          :disabled="disabled"
          :value="values[u]"
          :aria-label="UNIT_LABEL[u]"
          :aria-invalid="invalid || undefined"
          :class="inputClass"
          data-slot="duration-unit"
          @input="onUnitInput(u, $event)"
          @blur="blur"
        />
        <span>{{ UNIT_LABEL[u] }}</span>
      </label>
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
