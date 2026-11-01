<script lang="ts">
/** Props for {@link GuesserEmpty}. */
export interface GuesserEmptyProps {
  /** Replaces the default title. Translated, with itself as the fallback. */
  title?: string;
  /** Replaces the default message. Translated, with itself as the fallback. */
  message?: string;
  /** The resource named in the default message. */
  resource?: string;
}
</script>

<script setup lang="ts">
/**
 * `<GuesserEmpty>` — what a guesser shows when its resource has no registered
 * schema: an icon, a title and a message that names the resource. The `title`
 * and `message` slots win over the props, which win over the translated defaults.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { FileQuestionIcon } from "./icons";

const props = defineProps<GuesserEmptyProps>();

defineSlots<{
  /** Replaces the title text. */
  title?: () => unknown;
  /** Replaces the message text. */
  message?: () => unknown;
}>();

const translate = useTranslate();

const heading = computed(() =>
  props.title === undefined
    ? translate("chelone.guesser.no_schema.title", {
        _: "No schema registered",
      })
    : translate(props.title, { _: props.title }),
);

const body = computed(() =>
  props.message === undefined
    ? translate("chelone.guesser.no_schema.message", {
        _: "Register a Zod schema for {resource} with defineResources so this page can be generated.",
        resource: props.resource ?? "this resource",
      })
    : translate(props.message, { _: props.message }),
);
</script>

<template>
  <div class="flex flex-col items-center gap-3 p-8 text-center">
    <FileQuestionIcon class="size-12 text-muted-foreground" />
    <h2 class="text-xl font-semibold">
      <slot name="title">{{ heading }}</slot>
    </h2>
    <p class="text-sm text-muted-foreground">
      <slot name="message">{{ body }}</slot>
    </p>
  </div>
</template>
