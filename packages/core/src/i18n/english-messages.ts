import { mapMessages } from "../geo/messages";
import { defaultMessages } from "./default-messages";
import { defineMessages } from "./messages";

/**
 * The English catalog an `<Admin>` with no `i18n` prop reads from, and the base
 * an app extends: spread it, then add or override entries.
 *
 * The ported shadcn components translate `ra.*` keys (the react-admin namespace
 * they were ported from): page titles, list pagination, the bulk-action bar,
 * menu a11y labels, boolean fields. Chelone's i18n never throws on a missing key
 * (it returns the key or a `_` fallback), so a partial catalog shows raw
 * `ra.page.list`-style keys.
 *
 * Interpolation is single-brace `{name}` (not react-admin's `%{name}`). Plural
 * strings are `{ one, other }` objects keyed by Intl.PluralRules categories
 * (react-admin's `a |||| b` form).
 *
 * `defaultMessages` (the `chelone.*` keys the core controllers emit) and
 * `mapMessages` (the maps add-on's labels) sit underneath.
 */
export const englishMessages = defineMessages({
  ...defaultMessages,
  ...mapMessages,

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
  // No `{name}`: the list and input call sites pass no params for these.
  "ra.navigation.no_results": "No results found",
  "ra.navigation.no_filtered_results":
    "No results found with the current filters.",
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

  // Actions the components translate beyond the base set
  "ra.action.back": "Back",
  "ra.action.bulk_edit_apply": {
    one: "Apply to 1 record",
    other: "Apply to {count} records",
  },
  "ra.action.change_locale": "Change locale",
  "ra.action.clear_array_input": "Clear the array",
  "ra.action.clone": "Clone",
  "ra.action.collapse": "Collapse",
  "ra.action.expand": "Expand",
  "ra.action.move_column_down": "Move down",
  "ra.action.move_column_up": "Move up",
  "ra.action.move_down": "Move down",
  "ra.action.move_up": "Move up",
  "ra.action.reload": "Reload",
  "ra.action.remove_all_filters": "Remove all filters",
  "ra.action.reset": "Reset",
  "ra.action.reset_columns": "Reset",
  "ra.action.search_columns": "Search columns",
  "ra.action.select_columns": "Columns",

  // Auth
  "ra.auth.or": "or",

  // Calendar
  "ra.calendar.agenda": "Agenda",
  "ra.calendar.month": "Month",
  "ra.calendar.week": "Week",
  "ra.calendar.next": "Next",
  "ra.calendar.previous": "Previous",
  "ra.calendar.today": "Today",
  "ra.calendar.view": "View",
  "ra.calendar.no_events": "No events",

  // CSV import
  "ra.csv_import.back": "Back",
  "ra.csv_import.close": "Close",
  "ra.csv_import.complete": "Import complete",
  "ra.csv_import.counts": "{created} created · {failed} failed · {total} total",
  "ra.csv_import.download_errors": "Download error report",
  "ra.csv_import.drop": "Drop a CSV file here, or click to choose one",
  "ra.csv_import.import": "Import",
  "ra.csv_import.issues": "Issues",
  "ra.csv_import.next": "Next",
  "ra.csv_import.not_utf8":
    "This file is not UTF-8, so some letters may be wrong. Save it as CSV UTF-8 and try again.",
  "ra.csv_import.preview_summary":
    "{valid} valid · {errors} errors · {total} total",
  "ra.csv_import.required_unmapped": "Required fields are not mapped",
  "ra.csv_import.rows_parsed": "{count} rows parsed",
  "ra.csv_import.step.commit": "Importing",
  "ra.csv_import.step.map": "Map columns",
  "ra.csv_import.step.preview": "Preview",
  "ra.csv_import.step.upload": "Upload",
  "ra.csv_import.unmapped": "Not mapped",
  "ra.csv_import.wrong_file": "Choose a .csv file",

  // Confirmation dialogs and other messages
  "ra.message.bulk_delete_content": {
    one: "Are you sure you want to delete this item?",
    other: "Are you sure you want to delete these {count} items?",
  },
  "ra.message.bulk_delete_title": {
    one: "Delete 1 item",
    other: "Delete {count} items",
  },
  "ra.message.bulk_edit_description": {
    one: "Only the fields you change are applied to the selected record.",
    other:
      "Only the fields you change are applied to the {count} selected records.",
  },
  "ra.message.bulk_edit_nested_source":
    "Bulk edit takes flat sources only, but {source} is nested.",
  "ra.message.bulk_update_content": {
    one: "Are you sure you want to update this item?",
    other: "Are you sure you want to update these {count} items?",
  },
  "ra.message.bulk_update_title": {
    one: "Update 1 item",
    other: "Update {count} items",
  },
  "ra.message.clear_array_input":
    "Are you sure you want to clear the whole array?",
  "ra.message.delete_content": "Are you sure you want to delete this item?",
  "ra.message.delete_title": "Delete {name} {recordRepresentation}",

  // More navigation
  "ra.navigation.clear_filters": "Clear filters",

  // Notifications
  "ra.notification.application_update_available":
    "A new version of the application is available",
  "ra.notification.http_error": "Error",
  "ra.notification.offline": "You are offline",

  // Saved queries
  "ra.saved_queries.new_label": "Save current query",
  "ra.saved_queries.query_name": "Query name",
  "ra.saved_queries.remove_label_with_name": 'Remove saved query "{name}"',
});
