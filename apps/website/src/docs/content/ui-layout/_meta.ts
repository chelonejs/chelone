import type { MetaEntry } from "@/docs/types";

// The `<Admin>` slot pages lead, in the order the slots table lists them; the
// remaining pages follow alphabetically.
export default [
  { slug: "layout" },
  { slug: "login-page" },
  { slug: "error" },
  { slug: "ready" },
  { slug: "loading" },
  { slug: "access-denied" },
  { slug: "authentication-error" },
  { slug: "auth-callback" },
  { slug: "app-bar" },
  { slug: "app-sidebar" },
  { slug: "menu" },
] satisfies MetaEntry[];
