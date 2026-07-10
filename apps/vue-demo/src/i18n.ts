import { createI18n, defaultMessages, defineMessages } from "@chelone/core";

/**
 * The Vue demo's i18n catalog — the same `ra.*` namespace the ported shadcn
 * components translate (page titles, pagination, boolean fields, actions),
 * mirroring `apps/demo/src/i18n.ts`. Chelone's i18n never throws on a missing
 * key (it returns the key or a `_` fallback), so a partial catalog "works" but
 * shows raw keys; the full English catalog makes every label read as English.
 *
 * `defaultMessages` (the `chelone.*` keys the CORE controllers emit — save
 * notifications, validation messages) is merged underneath.
 */
const en = defineMessages({
  ...defaultMessages,

  // The SaveButton's default label lives in the `chelone.action.*` namespace,
  // which `defaultMessages` does not carry — supply it so the button reads
  // "Save" (not the raw key).
  "chelone.action.save": "Save",

  // Pages
  "ra.page.list": "{name}",
  "ra.page.create": "Create {name}",
  "ra.page.edit": "{name} {recordRepresentation}",
  "ra.page.show": "{name} {recordRepresentation}",
  "ra.page.empty": "No {name} yet.",

  // Actions
  "ra.action.cancel": "Cancel",
  "ra.action.create": "Create",
  "ra.action.delete": "Delete",
  "ra.action.edit": "Edit",
  "ra.action.list": "List",
  "ra.action.save": "Save",
  "ra.action.show": "Show",

  // Booleans
  "ra.boolean.true": "Yes",
  "ra.boolean.false": "No",
  "ra.boolean.null": " ",

  // Navigation / pagination
  "ra.navigation.next": "Go to next page",
  "ra.navigation.previous": "Go to previous page",
  "ra.navigation.page_range_info": "{offsetBegin}-{offsetEnd} of {total}",
  "ra.navigation.page_rows_per_page": "Rows per page:",
  "ra.navigation.no_results": "No {name} found",

  // Validation (ra namespace — some ported inputs read these)
  "ra.validation.required": "Required",
});

export function makeI18n() {
  return createI18n({
    locale: "en",
    messages: { en },
    fallbackLocale: "en",
  });
}
