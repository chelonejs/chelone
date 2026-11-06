<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import {
  formatRelativeTime,
  type LooseRecord,
  type SourceKey,
  type SourceProp,
  type SourceValue,
} from "@chelone/core";

/** Props for {@link ApiKeyField}. */
export interface ApiKeyFieldProps<
  RecordType extends LooseRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  /** The record to render. Defaults to the ambient `RecordContext` value. */
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  /**
   * Sibling record field with scope strings; renders chips when set. A
   * top-level key, not a path: the read is `record[scopesSource]`.
   */
  scopesSource?: SourceKey<RecordType>;
  /**
   * Sibling record field with an ISO last-used timestamp. A top-level key, not
   * a path: the read is `record[lastUsedSource]`.
   */
  lastUsedSource?: SourceKey<RecordType>;
  /** 'last4' shows the trailing 4 chars; 'full' masks everything. */
  maskedFormat?: "last4" | "full";
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<ApiKeyField>` — masked API-key display with reveal + copy controls, the Vue
 * analog of `@chelone/react`'s `fields/api-key-field.tsx`. Reads the key at
 * `source` off the ambient record; masks all but the last 4 chars by default.
 * Optional `scopesSource` renders scope badges; optional `lastUsedSource`
 * renders a relative "last used" timestamp. A nullish value renders nothing
 * (parity with the twin — this field has no `empty` fallback).
 *
 * Idiom translation from the twin: React holds `revealed`/`copied` in
 * `useState`; Vue uses `ref`s. The reveal/copy glyphs are inline SVGs (the Vue
 * `ui/` slice ships no `lucide-vue` dep), matching the icon approach of
 * `<BooleanField>` / `<RatingField>`.
 */

import { computed, inject, ref } from "vue";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import { RecordContextKey } from "../../../record/record-context";
import { useFieldValue } from "../../../record/use-field-value";

const props = defineProps<ApiKeyFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

// The scope and last-used reads are plain own-key reads of sibling fields, not
// path walks, so the record is read as a loose one.
const injectedRecord = inject(RecordContextKey, null);
const ctxRecord = computed<LooseRecord | undefined>(
  () => props.record ?? injectedRecord?.value,
);

const revealed = ref(false);
const copied = ref(false);

const key = computed(() => (value.value == null ? null : String(value.value)));

const masked = computed(() => {
  const k = key.value ?? "";
  return props.maskedFormat === "full"
    ? "•".repeat(k.length)
    : `${"•".repeat(Math.max(0, k.length - 4))}${k.slice(-4)}`;
});

const scopes = computed<string[] | undefined>(() => {
  const rec = ctxRecord.value;
  if (!props.scopesSource || !rec) return undefined;
  const s = rec[props.scopesSource];
  return Array.isArray(s) ? (s as string[]) : undefined;
});

const lastUsed = computed<string | null | undefined>(() => {
  const rec = ctxRecord.value;
  if (!props.lastUsedSource || !rec) return undefined;
  return rec[props.lastUsedSource] as string | null | undefined;
});

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(key.value ?? "");
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    /* ignore clipboard failures */
  }
}
</script>

<template>
  <span
    v-if="key != null"
    data-slot="api-key-field"
    :class="cn('inline-flex flex-col gap-1', props.class)"
  >
    <span class="inline-flex items-center gap-2">
      <span data-api-key class="font-mono text-sm">{{
        revealed ? key : masked
      }}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-api-key-reveal
        :aria-label="revealed ? 'Hide API key' : 'Reveal API key'"
        @click="revealed = !revealed"
      >
        <svg
          v-if="revealed"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
          />
          <path
            d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
          />
          <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
        <svg
          v-else
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Copy API key"
        @click="handleCopy"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
        </svg>
      </Button>
      <span v-if="copied" class="text-xs text-muted-foreground">Copied!</span>
    </span>
    <span v-if="scopes && scopes.length > 0" class="flex gap-1">
      <span
        v-for="s in scopes"
        :key="s"
        data-scope-badge
        class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
        >{{ s }}</span
      >
    </span>
    <span v-if="lastUsedSource" class="text-xs text-muted-foreground"
      >Last used: {{ lastUsed ? formatRelativeTime(new Date(lastUsed), new Date()) : "Never" }}</span
    >
  </span>
</template>
