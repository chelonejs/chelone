<script lang="ts">
import type { CalendarView } from "@chelone/core";

/** Where the header moves the calendar. */
export type CalendarNavigateDirection = "previous" | "next" | "today";

/** Props for {@link CalendarHeader}. */
export interface CalendarHeaderProps {
  /** The label of the visible range, such as "May 2026". */
  title: string;
  /** The view shown. */
  view?: CalendarView;
  /** The views offered. The switcher shows with more than one. */
  views?: CalendarView[];
}
</script>

<script setup lang="ts">
/**
 * `<CalendarHeader>` — the title of the visible range with Previous, Today and
 * Next buttons, and a switcher between the views on offer. The default
 * `#header` of a `<CalendarList>`.
 */

import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import { ChevronLeftIcon, ChevronRightIcon } from "./list-icons";

defineProps<CalendarHeaderProps>();
const emit = defineEmits<{
  navigate: [direction: CalendarNavigateDirection];
  viewChange: [view: CalendarView];
}>();

const translate = useTranslate();
const viewLabel = (view: CalendarView) =>
  view === "month"
    ? translate("chelone.calendar.month", { _: "Month" })
    : view === "week"
      ? translate("chelone.calendar.week", { _: "Week" })
      : translate("chelone.calendar.agenda", { _: "Agenda" });
</script>

<template>
  <div
    data-slot="calendar-header"
    class="flex flex-wrap items-center justify-between gap-2"
  >
    <h2 data-slot="calendar-title" aria-live="polite" class="text-lg font-semibold">
      {{ title }}
    </h2>
    <div class="flex flex-wrap items-center gap-2">
      <div
        v-if="views && views.length > 1"
        data-slot="calendar-view-switcher"
        role="group"
        :aria-label="translate('chelone.calendar.view', { _: 'View' })"
        class="flex items-center gap-1"
      >
        <Button
          v-for="option in views"
          :key="option"
          :data-view="option"
          :variant="option === view ? 'secondary' : 'ghost'"
          size="sm"
          :aria-pressed="option === view"
          @click="emit('viewChange', option)"
        >
          {{ viewLabel(option) }}
        </Button>
      </div>
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          :aria-label="translate('chelone.calendar.previous', { _: 'Previous' })"
          @click="emit('navigate', 'previous')"
        >
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" size="sm" @click="emit('navigate', 'today')">
          {{ translate("chelone.calendar.today", { _: "Today" }) }}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          :aria-label="translate('chelone.calendar.next', { _: 'Next' })"
          @click="emit('navigate', 'next')"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  </div>
</template>
