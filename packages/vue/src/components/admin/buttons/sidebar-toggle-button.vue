<script lang="ts">
/** Props for {@link SidebarToggleButton}. */
export interface SidebarToggleButtonProps {
  /** Extra CSS class appended to the button. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SidebarToggleButton>` — a standalone button that opens/closes the sidebar.
 * The Vue twin of `@chelone/react`'s `buttons/sidebar-toggle-button.tsx`, for
 * use in custom headers. Wired to `useSidebar().toggleSidebar`; the aria-label
 * flips between the translated "Open menu" / "Close menu" (mirroring the React
 * twin's tooltip text).
 *
 * Divergence: the React twin wraps the shadcn `<SidebarTrigger>` in a
 * `<Tooltip>`; the Vue slice has no `<Tooltip>` primitive yet (see
 * `menu-item-link.vue`), so this renders the button directly with the label as
 * `aria-label` and defers the visible tooltip to a later surface-parity wave.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import { useSidebar } from "../../ui/sidebar";
import { PanelLeftIcon } from "./icons";

const props = defineProps<SidebarToggleButtonProps>();

const { open, toggleSidebar } = useSidebar();
const translate = useTranslate();

const label = computed(() =>
  open.value
    ? translate("chelone.action.close_menu", { _: "Close menu" })
    : translate("chelone.action.open_menu", { _: "Open menu" }),
);
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    class="scale-125 sm:scale-100"
    :class="props.class"
    :aria-label="label"
    data-slot="sidebar-toggle-button"
    @click="toggleSidebar"
  >
    <PanelLeftIcon />
  </Button>
</template>
