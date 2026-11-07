<script setup lang="ts">
/**
 * `<MenuItemLink>` is one sidebar row: an icon, its label, and the `<kbd>`
 * shortcut hint. The row links to the preview page it sits on, which is what
 * gives it the active highlight `useMatch` reads off the current route, the way
 * the React twin names the page you are reading.
 */

import {
  MenuItemLink,
  SidebarMenu,
  SidebarProvider,
  useLocation,
} from "@chelone/vue";

const location = useLocation();
</script>

<template>
  <!-- The Vue `cn` only joins classes, so the width sits on a wrapper: a `w-56`
       on the menu would sit beside the menu's own `w-full` and lose. -->
  <div class="w-56">
    <SidebarProvider>
      <SidebarMenu>
        <MenuItemLink
          :to="location.pathname"
          label="MenuItemLink"
          keyboard-shortcut="mod+,"
        >
          <template #icon>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 7v6.5" />
              <path
                d="M3 18a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"
              />
              <path
                d="M21 18a1 1 0 0 1-1 1h-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v12a1 1 0 0 1-1 1Z"
              />
            </svg>
          </template>
        </MenuItemLink>
      </SidebarMenu>
    </SidebarProvider>
  </div>
</template>
