import type { MetaEntry } from "@/docs/types";

// Pages sit under a heading in the sidebar and on the section landing. A page
// no category lists is appended alphabetically with no heading, and
// nav-content.test.ts fails until it has a category.
// `demos/` holds the landing's live previews, not pages, so it stays out here.
export default [
  {
    category: "Text & number inputs",
    slugs: [
      "text-input",
      "resettable-text-input",
      "password-input",
      "number-input",
      "currency-input",
      "rating-input",
      "phone-input",
      "search-input",
      "color-input",
      "text-array-input",
      "loading-input",
    ],
  },
  {
    category: "Date & time inputs",
    slugs: [
      "date-input",
      "date-time-input",
      "time-input",
      "duration-input",
      "cron-input",
    ],
  },
  {
    category: "Choices & references",
    slugs: [
      "select-input",
      "select-array-input",
      "autocomplete-input",
      "autocomplete-array-input",
      "radio-button-group-input",
      "checkbox-group-input",
      "boolean-input",
      "nullable-boolean-input",
      "reference-input",
      "reference-array-input",
    ],
  },
  {
    category: "Rich & structured inputs",
    slugs: [
      "mdx-input",
      "monaco-json-input",
      "file-input",
      "image-input",
      "array-input",
      "simple-form-iterator",
      "datagrid-input",
      "translatable-inputs",
      "api-key-input",
      "subscription-plan-picker",
      "webhook-endpoint-input",
    ],
  },
  {
    category: "Forms",
    slugs: ["tabbed-form", "wizard-form", "filter-form"],
  },
  {
    category: "Buttons",
    slugs: [
      "save-button",
      "cancel-button",
      "create-button",
      "edit-button",
      "show-button",
      "clone-button",
      "delete-button",
      "update-button",
      "status-transition-button",
      "dual-approval-button",
    ],
  },
  {
    category: "Bulk actions",
    slugs: [
      "bulk-delete-button",
      "bulk-edit-drawer",
      "bulk-export-button",
      "bulk-update-button",
    ],
  },
] satisfies MetaEntry[];
