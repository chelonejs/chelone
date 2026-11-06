import type { MetaEntry } from "@/docs/types";

export default [
  {
    category: "Provider builders & transports",
    slugs: [
      "add-events-for-mutations",
      "memory-transport",
      "broadcast-channel-transport",
      "websocket-transport",
      "sse-transport",
      "in-memory-lock-provider",
    ],
  },
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
    category: "Subscribe & publish hooks",
    slugs: [
      "use-subscribe",
      "use-subscribe-to-record",
      "use-subscribe-to-record-list",
      "use-subscribe-callback",
      "use-publish",
      "use-on-reconnect",
      "use-realtime-status",
    ],
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
