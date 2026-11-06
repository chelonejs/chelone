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
  {
    category: "Live read hooks",
    slugs: ["use-get-list-live", "use-get-one-live", "use-get-many-live"],
  },
  {
    category: "Lock hooks",
    slugs: [
      "use-lock",
      "use-unlock",
      "use-get-lock",
      "use-get-lock-live",
      "use-get-locks",
      "use-get-locks-live",
      "use-lock-on-mount",
    ],
  },
] satisfies MetaEntry[];
