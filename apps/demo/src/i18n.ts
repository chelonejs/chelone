import { createI18n, defaultMessages, defineMessages } from "@chelone/core";

/**
 * The demo's i18n catalog. The ported shadcn components translate `ra.*` keys
 * (the react-admin namespace they were ported from) — page titles, list
 * pagination, bulk-action bar, menu a11y labels, boolean fields, etc. Chelone's
 * i18n never throws on a missing key (it returns the key or a `_` fallback), so
 * a partial catalog "works" but shows raw `ra.page.list`-style keys; supplying
 * the full English catalog makes every label read as English.
 *
 * Note the interpolation syntax: chelone uses single-brace `{name}` (NOT
 * react-admin's `%{name}`), and plural strings become `{ one, other }` objects
 * keyed by Intl.PluralRules categories (react-admin's `a |||| b` form).
 *
 * `defaultMessages` (the `chelone.*` keys the CORE controllers emit — save
 * notifications, validation messages) is merged underneath.
 */
const en = defineMessages({
  ...defaultMessages,

  // Pages
  "ra.page.list": "{name}",
  "ra.page.create": "Create {name}",
  "ra.page.edit": "{name} {recordRepresentation}",
  "ra.page.show": "{name} {recordRepresentation}",
  "ra.page.dashboard": "Dashboard",
  "ra.page.error": "Something went wrong",
  "ra.page.not_found": "Not Found",
  "ra.page.loading": "Loading",
  "ra.page.empty": "No {name} yet.",
  "ra.page.access_denied": "Access denied",
  "ra.page.authentication_error": "Authentication error",

  // Actions
  "ra.action.add": "Add",
  "ra.action.add_filter": "Add filter",
  "ra.action.bulk_actions": {
    one: "1 item selected",
    other: "{count} items selected",
  },
  "ra.action.cancel": "Cancel",
  "ra.action.clear_input_value": "Clear value",
  "ra.action.clear_search": "Clear search",
  "ra.action.close": "Close",
  "ra.action.close_menu": "Close menu",
  "ra.action.confirm": "Confirm",
  "ra.action.create": "Create",
  "ra.action.delete": "Delete",
  "ra.action.edit": "Edit",
  "ra.action.export": "Export",
  "ra.action.list": "List",
  "ra.action.open_menu": "Open menu",
  "ra.action.refresh": "Refresh",
  "ra.action.remove": "Remove",
  "ra.action.remove_filter": "Remove this filter",
  "ra.action.save": "Save",
  "ra.action.search": "Search",
  "ra.action.select_all": "Select all",
  "ra.action.select_row": "Select this row",
  "ra.action.show": "Show",
  "ra.action.sort": "Sort",
  "ra.action.toggle_theme": "Toggle light/dark mode",
  "ra.action.undo": "Undo",
  "ra.action.unselect": "Unselect",
  "ra.action.update": "Update",

  // Booleans
  "ra.boolean.true": "Yes",
  "ra.boolean.false": "No",
  "ra.boolean.null": " ",

  // Auth
  "ra.auth.logout": "Logout",
  "ra.auth.sign_in": "Sign in",
  "ra.auth.sign_in_error": "Authentication failed, please retry",
  "ra.auth.user_menu": "Profile",
  "ra.auth.username": "Username",
  "ra.auth.password": "Password",
  "ra.auth.auth_check_error": "Please login to continue",

  // Messages
  "ra.message.access_denied":
    "You don't have the right permissions to access this page",
  "ra.message.auth_error":
    "An error occurred while validating the authentication token.",
  "ra.message.authentication_error":
    "The authentication server returned an error and your credentials could not be checked.",
  "ra.message.error":
    "A client error occurred and your request couldn't be completed.",
  "ra.message.invalid_form": "The form is not valid. Please check for errors",
  "ra.message.loading": "Please wait",
  "ra.message.not_found":
    "Either you typed a wrong URL, or you followed a bad link.",

  // Navigation / pagination
  "ra.navigation.next": "Go to next page",
  "ra.navigation.previous": "Go to previous page",
  "ra.navigation.first": "Go to first page",
  "ra.navigation.last": "Go to last page",
  "ra.navigation.no_results": "No {name} found",
  "ra.navigation.no_filtered_results":
    "No {name} found using the current filters.",
  "ra.navigation.page_range_info": "{offsetBegin}-{offsetEnd} of {total}",
  "ra.navigation.partial_page_range_info":
    "{offsetBegin}-{offsetEnd} of more than {offsetEnd}",
  "ra.navigation.page_rows_per_page": "Rows per page:",
  "ra.navigation.current_page": "Page {page}",
  "ra.navigation.skip_nav": "Skip to content",

  // Inputs
  "ra.input.file.upload_several":
    "Drop some files to upload, or click to select one.",
  "ra.input.file.upload_single":
    "Drop a file to upload, or click to select it.",
  "ra.input.image.upload_several":
    "Drop some pictures to upload, or click to select one.",
  "ra.input.image.upload_single":
    "Drop a picture to upload, or click to select it.",
  "ra.input.password.toggle_visible": "Hide password",
  "ra.input.password.toggle_hidden": "Show password",

  // Theme
  "ra.theme.light": "Light",
  "ra.theme.dark": "Dark",
  "ra.theme.system": "System",

  // Validation (ra namespace — some ported inputs read these)
  "ra.validation.required": "Required",
  "ra.validation.minLength": "Must be {min} characters at least",
  "ra.validation.maxLength": "Must be {max} characters or less",
  "ra.validation.minValue": "Must be at least {min}",
  "ra.validation.maxValue": "Must be {max} or less",
  "ra.validation.number": "Must be a number",
  "ra.validation.email": "Must be a valid email",
});

export function makeI18n() {
  return createI18n({
    locale: "en",
    messages: { en },
    fallbackLocale: "en",
  });
}
