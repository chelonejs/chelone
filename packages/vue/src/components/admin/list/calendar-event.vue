<script lang="ts" generic="TRecord extends ResourceRecord = LooseRecord">
import type { CalendarEvent, LooseRecord, ResourceRecord } from "@chelone/core";

/** Props for {@link CalendarEventButton}. */
export interface CalendarEventProps<
  TRecord extends ResourceRecord = LooseRecord,
> {
  event: CalendarEvent<TRecord>;
  /** The link the event is, when it navigates. */
  href?: string;
  /** Whether activating the event does anything: it is inert otherwise. */
  selectable: boolean;
}
</script>

<script
  setup
  lang="ts"
  generic="TRecord extends ResourceRecord = LooseRecord"
>
/**
 * `<CalendarEventButton>` — one event as a link, a button or an inert label.
 * The week and agenda views render their events with it; the month view keeps
 * its own. Emits `select` with the record on a plain click.
 */

import { computed } from "vue";

const props = defineProps<CalendarEventProps<TRecord>>();
const emit = defineEmits<{ select: [record: TRecord] }>();

const tag = computed(() =>
  props.href ? "a" : props.selectable ? "button" : "span",
);

function onClick(event: MouseEvent) {
  if (!props.selectable) return;
  // A modified click keeps the browser's own link behaviour.
  const plain =
    event.button === 0 &&
    !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
  if (event.currentTarget instanceof HTMLAnchorElement && !plain) return;
  event.preventDefault();
  emit("select", props.event.record);
}
</script>

<template>
  <component
    :is="tag"
    data-slot="calendar-event"
    :data-color="event.color"
    :href="href"
    :type="tag === 'button' ? 'button' : undefined"
    :style="event.color ? { backgroundColor: event.color } : undefined"
    class="block w-full truncate rounded px-1.5 py-0.5 text-left text-xs"
    :class="event.color ? 'text-white' : 'bg-primary text-primary-foreground'"
    @click="onClick"
  >
    {{ event.title }}
  </component>
</template>
