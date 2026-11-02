<script lang="ts">
/** Where the header moves the calendar. */
export type CalendarNavigateDirection = "previous" | "next" | "today";

/** Props for {@link CalendarHeader}. */
export interface CalendarHeaderProps {
  /** The label of the visible range, such as "May 2026". */
  title: string;
}
</script>

<script setup lang="ts">
/**
 * `<CalendarHeader>` — the title of the visible range with Previous, Today and
 * Next buttons. The default `#header` of a `<CalendarList>`.
 */

import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import { ChevronLeftIcon, ChevronRightIcon } from "./list-icons";

defineProps<CalendarHeaderProps>();
const emit = defineEmits<{ navigate: [direction: CalendarNavigateDirection] }>();

const translate = useTranslate();
</script>

<template>
  <div
    data-slot="calendar-header"
    class="flex flex-wrap items-center justify-between gap-2"
  >
    <h2 data-slot="calendar-title" aria-live="polite" class="text-lg font-semibold">
      {{ title }}
    </h2>
    <div class="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        :aria-label="translate('ra.navigation.previous', { _: 'Previous' })"
        @click="emit('navigate', 'previous')"
      >
        <ChevronLeftIcon />
      </Button>
      <Button variant="outline" size="sm" @click="emit('navigate', 'today')">
        {{ translate("ra.calendar.today", { _: "Today" }) }}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :aria-label="translate('ra.navigation.next', { _: 'Next' })"
        @click="emit('navigate', 'next')"
      >
        <ChevronRightIcon />
      </Button>
    </div>
  </div>
</template>
