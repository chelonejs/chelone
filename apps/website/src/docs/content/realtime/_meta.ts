import type { MetaEntry } from "@/docs/types";

export default [
  {
    category: "Live views & menus",
    slugs: ["list-live", "edit-live", "show-live", "menu-live"],
  },
  {
    category: "Collaboration",
    slugs: ["presence-bar", "comments-thread"],
  },
  {
    category: "Record locks",
    slugs: ["lock-on-mount", "lock-status"],
  },
] satisfies MetaEntry[];
