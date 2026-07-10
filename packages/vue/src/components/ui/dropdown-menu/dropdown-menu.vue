<script setup lang="ts">
/**
 * `<DropdownMenu>` — the root of the dependency-free dropdown family, the Vue
 * analog of shadcn's radix-backed `DropdownMenu`.
 *
 * DELIBERATE DIVERGENCE from the React/radix twin: the Vue `ui/` slice carries
 * no reka-ui, so there is no portal + floating-ui positioning. This renders a
 * `relative inline-block` wrapper; `<DropdownMenuContent>` positions
 * `absolute`ly within it. The root owns the `open` ref + the wrapper element ref
 * and dismisses on an outside `mousedown` or the `Escape` key (the document
 * listeners are attached only while open), covering the accessibility contract
 * the tests exercise without a positioning dependency.
 */

import { onBeforeUnmount, ref, watch } from "vue";
import { provideDropdownMenu } from "./context";

const rootRef = ref<HTMLElement | null>(null);
const open = ref(false);

function setOpen(value: boolean): void {
  open.value = value;
}
function toggle(): void {
  open.value = !open.value;
}

provideDropdownMenu({ open, rootRef, setOpen, toggle });

function onDocumentPointerDown(event: MouseEvent): void {
  const root = rootRef.value;
  if (root && !root.contains(event.target as Node)) setOpen(false);
}
function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") setOpen(false);
}

function detach(): void {
  if (typeof document === "undefined") return;
  document.removeEventListener("mousedown", onDocumentPointerDown);
  document.removeEventListener("keydown", onDocumentKeydown);
}

// Attach the dismissal listeners only while the menu is open.
watch(open, (isOpen) => {
  if (typeof document === "undefined") return;
  if (isOpen) {
    document.addEventListener("mousedown", onDocumentPointerDown);
    document.addEventListener("keydown", onDocumentKeydown);
  } else {
    detach();
  }
});

onBeforeUnmount(detach);
</script>

<template>
  <div ref="rootRef" class="relative inline-block" data-slot="dropdown-menu">
    <slot />
  </div>
</template>
