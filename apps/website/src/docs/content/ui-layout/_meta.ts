import type { MetaEntry } from "@/docs/types";

// Pages sit under a heading in the sidebar and on the section landing. A page
// no category lists is appended alphabetically with no heading, and
// nav-content.test.ts fails until it has a category.
export default [
  {
    category: "Shell",
    slugs: [
      "layout",
      "app-bar",
      "top-toolbar",
      "toolbar",
      "app-sidebar",
      "sidebar-toggle-button",
      "hide-on-scroll",
      "title",
      "title-portal",
      "skip-navigation-button",
      "assistant",
    ],
  },
  {
    category: "Navigation & menus",
    slugs: [
      "menu",
      "menu-item-link",
      "dashboard-menu-item",
      "resource-menu-item",
      "resource-menu-item-group",
      "command-menu",
      "link",
      "list-button",
      "user-menu",
      "locales-menu-button",
      "theme-mode-toggle",
    ],
  },
  {
    category: "Auth",
    slugs: [
      "login-page",
      "login-form",
      "login-with-email",
      "auth-layout",
      "auth-callback",
      "auth-error",
      "authentication-error",
      "access-denied",
      "logout",
      "can-access",
    ],
  },
  {
    category: "App states & feedback",
    slugs: [
      "ready",
      "loading",
      "loading-indicator",
      "linear-progress",
      "error",
      "not-found",
      "offline",
      "placeholder",
      "notification",
      "confirm",
    ],
  },
  {
    category: "Updates & helpers",
    slugs: [
      "application-updated-notification",
      "check-for-application-update",
      "refresh-button",
      "refresh-icon-button",
      "icon-button-with-tooltip",
      "keyboard-shortcut",
      "onboarding-tour",
      "data-provider-devtools",
    ],
  },
] satisfies MetaEntry[];
