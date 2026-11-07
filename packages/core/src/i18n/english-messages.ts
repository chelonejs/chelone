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

  // Component labels, grouped by the component that translates them. Every
  // literal `ra.*`/`chelone.*` key in production code is here, so a translator
  // can list them all and the two adapters read the same text for one key
  // (`scripts/i18n-literals.test.mjs` fails on a literal key that is missing).
  // Where the adapters worded a key differently this is React's text, and
  // Vue's inline fallback now matches it.

  // Assistant panel
  "chelone.assistant.close": "Close",
  "chelone.assistant.confirm": "Run {name}?",
  "chelone.assistant.error": "Something went wrong.",
  "chelone.assistant.placeholder": "Ask…",
  "chelone.assistant.retry": "Retry",
  "chelone.assistant.send": "Send",
  "chelone.assistant.stop": "Stop",
  "chelone.assistant.thinking": "Thinking…",
  "chelone.assistant.trigger": "Ask",
  "chelone.assistant.welcome": "Hi! Ask me anything.",

  // Approval: the dual approval button and the approval queue
  "chelone.approval.already_approved": "You already approved",
  "chelone.approval.approve": "Approve",
  "chelone.approval.complete": "Fully approved ({count} of {required})",
  "chelone.approval.count": "{count} of {required}",
  "chelone.approval.fully_approved": "Fully approved ({count} of {required})",
  "chelone.approval.reject": "Reject",
  "chelone.approval_queue.confirm_reject": "Confirm reject",
  "chelone.approval_queue.empty": "No items waiting for approval",
  "chelone.approval_queue.reason": "Reason",
  "chelone.approval_queue.rejected": "Rejected",

  // Block editor
  "chelone.block_editor.add_block": "Add block",
  "chelone.block_editor.chart.aggregate": "Aggregate",
  "chelone.block_editor.chart.avg": "Average",
  "chelone.block_editor.chart.bar": "Bar",
  "chelone.block_editor.chart.category": "Category field",
  "chelone.block_editor.chart.count": "Count",
  "chelone.block_editor.chart.description": "Aggregate a resource into a chart",
  "chelone.block_editor.chart.label": "Chart",
  "chelone.block_editor.chart.line": "Line",
  "chelone.block_editor.chart.pie": "Pie",
  "chelone.block_editor.chart.sum": "Sum",
  "chelone.block_editor.chart.type": "Chart type",
  "chelone.block_editor.chart.value": "Value field",
  "chelone.block_editor.data.choose_resource": "Choose a resource",
  "chelone.block_editor.data.fields": "Fields",
  "chelone.block_editor.data.fields_hint": "title, status",
  "chelone.block_editor.data.resource": "Resource",
  "chelone.block_editor.drag": "Drag to move",
  "chelone.block_editor.embed.empty": "Add a YouTube or Vimeo link",
  "chelone.block_editor.embed.title": "Embedded video",
  "chelone.block_editor.image.alt": "Alt text",
  "chelone.block_editor.image.empty": "Add an image",
  "chelone.block_editor.image.too_large": "Choose an image file up to 5 MB",
  "chelone.block_editor.image.upload": "Upload image",
  "chelone.block_editor.image.url": "Image URL",
  "chelone.block_editor.image.width": "Width (%)",
  "chelone.block_editor.no_blocks": "No blocks found",
  "chelone.block_editor.placeholder": "Type / for blocks",
  "chelone.block_editor.recordList.description":
    "Embed a live list from a resource",
  "chelone.block_editor.recordList.label": "Record list",
  "chelone.block_editor.recordList.no_records": "No records",
  "chelone.block_editor.recordList.per_page": "Rows",
  "chelone.block_editor.referenceRecord.card": "Card",
  "chelone.block_editor.referenceRecord.description": "Embed a live record",
  "chelone.block_editor.referenceRecord.id": "Record id",
  "chelone.block_editor.referenceRecord.inline": "Inline",
  "chelone.block_editor.referenceRecord.label": "Reference record",
  "chelone.block_editor.referenceRecord.layout": "Layout",
  "chelone.block_editor.search": "Search blocks",
  "chelone.block_editor.toolbar.configure": "Configure",
  "chelone.block_editor.toolbar.delete": "Delete",
  "chelone.block_editor.toolbar.duplicate": "Duplicate",
  "chelone.block_editor.toolbar.label": "Block actions",
  "chelone.block_editor.toolbar.move_down": "Move down",
  "chelone.block_editor.toolbar.move_up": "Move up",
  "chelone.block_editor.unknown": "Unknown block: {type}. It is kept on save.",

  // Charts, the command menu and the comments thread
  "chelone.chart.empty": "No data",
  "chelone.command_menu.account": "Account",
  "chelone.command_menu.action.logout": "Log out",
  "chelone.command_menu.action.refresh": "Refresh data",
  "chelone.command_menu.action.theme_dark": "Switch to dark theme",
  "chelone.command_menu.action.theme_light": "Switch to light theme",
  "chelone.command_menu.action.theme_system": "Use system theme",
  "chelone.command_menu.actions": "Actions",
  "chelone.command_menu.close": "Close",
  "chelone.command_menu.description":
    "Jump to a page or record, or run an action.",
  "chelone.command_menu.empty": "No results found.",
  "chelone.command_menu.footer.close": "Close",
  "chelone.command_menu.footer.navigate": "Navigate",
  "chelone.command_menu.footer.select": "Select",
  "chelone.command_menu.navigate": "Navigate",
  "chelone.command_menu.placeholder": "Search or run a command...",
  "chelone.command_menu.recent": "Recent",
  "chelone.command_menu.refresh": "Refresh",
  "chelone.command_menu.resources": "Resources",
  "chelone.command_menu.select": "Select",
  "chelone.command_menu.theme": "Theme",
  "chelone.command_menu.title": "Command menu",
  "chelone.comments.anonymous": "anonymous",
  "chelone.comments.empty": "No comments yet. Be the first.",
  "chelone.comments.load_failed": "Could not load the comments",
  "chelone.comments.mark_resolved": "Mark resolved",
  "chelone.comments.placeholder": "Write a comment…",
  "chelone.comments.post": "Post",
  "chelone.comments.resolved": "Resolved {time}",
  "chelone.comments.showing": "Showing the first {shown} of {total} comments",
  "chelone.comments.showing_first":
    "Showing the first {shown} of {total} comments",

  // Devtools, diff viewer and the schema guesser
  "chelone.devtools.clear": "Clear",
  "chelone.devtools.details": "Details",
  "chelone.devtools.empty": "No calls yet",
  "chelone.devtools.hide": "Hide",
  "chelone.devtools.params": "Params",
  "chelone.devtools.result": "Result",
  "chelone.devtools.show": "Show",
  "chelone.devtools.title": "Data provider",
  "chelone.diff_viewer.after": "After",
  "chelone.diff_viewer.before": "Before",
  "chelone.diff_viewer.empty": "(empty)",
  "chelone.diff_viewer.field": "Field",
  "chelone.guesser.no_schema.message":
    "Register a Zod schema for {resource} with defineResources so this page can be generated.",
  "chelone.guesser.no_schema.title": "No schema registered",

  // The missing-key editor and the inspector
  "chelone.i18n_key_editor.copied": "Copied",
  "chelone.i18n_key_editor.copy_failed": "Could not copy the translations",
  "chelone.i18n_key_editor.empty": "No missing keys yet",
  "chelone.i18n_key_editor.export": "Export",
  "chelone.i18n_key_editor.hide": "Hide",
  "chelone.i18n_key_editor.show": "Show",
  "chelone.i18n_key_editor.title": "Missing keys ({count})",
  "chelone.inspector.configure_mode": "Configure mode",
  "chelone.inspector.customize": "Customize",
  "chelone.inspector.drag_field": "Drag to reorder",
  "chelone.inspector.empty": "Pick an outlined element to configure it",
  "chelone.inspector.inputs_title": "Form",
  "chelone.inspector.title": "Inspector",

  // Job monitor, kanban board and record locks
  "chelone.job_monitor.attempts": "Attempts: {attempts}",
  "chelone.job_monitor.empty": "No {status} jobs",
  "chelone.job_monitor.hide_payload": "Hide payload",
  "chelone.job_monitor.no_type": "(no type)",
  "chelone.job_monitor.retry": "Retry",
  "chelone.job_monitor.show_payload": "Show payload",
  "chelone.job_monitor.title": "Jobs",
  "chelone.kanban_board.empty": "No items",
  "chelone.kanban_board.move": "Move {title}",
  "chelone.lock.locked_by": "Locked by {identity}",

  // Lists: infinite pagination, the pivot grid and the record timeline
  "chelone.navigation.load_more": "Load more",
  "chelone.navigation.no_more_rows": "No more rows",
  "chelone.onboarding_tour.back": "Back",
  "chelone.onboarding_tour.finish": "Finish",
  "chelone.onboarding_tour.next": "Next",
  "chelone.onboarding_tour.skip": "Skip",
  "chelone.permission_matrix.all": "All",
  "chelone.permission_matrix.cell": "{role} {action} {resource}",
  "chelone.permission_matrix.inherited": "Granted by a wildcard",
  "chelone.permission_matrix.no_roles": "No roles defined",
  "chelone.permission_matrix.resource": "Resource",
  "chelone.pivot_grid.no_value": "(none)",
  "chelone.pivot_grid.total": "Total",
  "chelone.record_timeline.empty": "No activity yet",

  // Rich text
  "chelone.rich_text.block_type": "Block type",
  "chelone.rich_text.color": "Text color",
  "chelone.rich_text.image": "Image",
  "chelone.rich_text.image.close": "Close",
  "chelone.rich_text.image.error": "The image could not be loaded",
  "chelone.rich_text.image.resize_left": "Resize image from the left edge",
  "chelone.rich_text.image.resize_right": "Resize image from the right edge",
  "chelone.rich_text.image.uploading": "Uploading image",
  "chelone.rich_text.image.view": "View image",
  "chelone.rich_text.image_apply": "Apply",
  "chelone.rich_text.image_upload": "Upload",
  "chelone.rich_text.image_url": "Image URL",
  "chelone.rich_text.invalid_image_url": "Enter a link to an image",
  "chelone.rich_text.invalid_url": "Enter a web, mail or phone link",
  "chelone.rich_text.link_apply": "Apply",
  "chelone.rich_text.link_remove": "Remove",
  "chelone.rich_text.link_url": "URL",
  "chelone.rich_text.paragraph": "Paragraph",
  "chelone.rich_text.toolbar": "Formatting",

  // Status transitions, and the JSON input's Format button
  "chelone.action.format": "Format",
  "chelone.status_transition.change": "Change status",
  "chelone.status_transition.confirm_content": "Move to {status}?",
  "chelone.status_transition.confirm_title": "Change status?",
  "chelone.validation.invalid_json": "Invalid JSON: {message}",
});
