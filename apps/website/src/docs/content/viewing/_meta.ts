import type { MetaEntry } from "@/docs/types";

// Pages sit under a heading in the sidebar and on the section landing. A page
// no category lists is appended alphabetically with no heading, and
// nav-content.test.ts fails until it has a category.
export default [
  {
    category: "Basic fields",
    slugs: [
      "text-field",
      "text-array-field",
      "number-field",
      "currency-field",
      "boolean-field",
      "date-field",
      "duration-field",
      "select-field",
      "chip-field",
      "badge-field",
      "color-field",
      "email-field",
      "phone-field",
      "url-field",
      "rating-field",
      "count",
    ],
  },
  {
    category: "Rich & structured fields",
    slugs: [
      "json-field",
      "monaco-json-field",
      "mdx-field",
      "cron-field",
      "image-field",
      "file-field",
      "array-field",
      "translatable-fields",
      "api-key-field",
      "subscription-plan-field",
      "usage-meter-field",
      "webhook-endpoint-field",
    ],
  },
  {
    category: "Field helpers",
    slugs: ["function-field", "wrapper-field", "record-field", "labeled"],
  },
  {
    category: "References",
    slugs: [
      "reference-field",
      "reference-array-field",
      "reference-many-field",
      "reference-one-field",
      "reference-many-count",
    ],
  },
  {
    category: "Lists & show layouts",
    slugs: [
      "simple-list",
      "simple-list-item",
      "simple-list-loading",
      "single-field-list",
      "tree-list",
      "calendar-list",
      "kanban-board",
      "tabbed-show-layout",
      "card-content-inner",
      "list-no-results",
    ],
  },
  {
    category: "Filtering & sorting",
    slugs: [
      "filter-button",
      "filter-list",
      "filter-list-item",
      "filter-list-section",
      "filter-live-form",
      "filter-live-search",
      "toggle-filter-button",
      "saved-queries-list",
      "sort-button",
    ],
  },
  {
    category: "List toolbar & pagination",
    slugs: [
      "list-actions",
      "list-toolbar",
      "list-pagination",
      "infinite-pagination",
      "prev-next-buttons",
      "bulk-actions-toolbar",
      "select-all-button",
      "columns-button",
      "export-button",
    ],
  },
] satisfies MetaEntry[];
