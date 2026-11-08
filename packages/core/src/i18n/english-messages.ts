import { mapMessages } from "../geo/messages";
import { defaultMessages } from "./default-messages";
import { defineMessages } from "./messages";

/**
 * The English catalog an `<Admin>` with no `i18n` prop reads from, and the base
 * an app extends: spread it, then add or override entries.
 *
 * Every key is `chelone.<group>.<leaf>`: the ported shadcn components used to
 * translate the react-admin `ra.*` keys they were ported from, and those keys
 * were moved under `chelone.*` with their group names kept (`page`, `action`,
 * `navigation`). Chelone's i18n never throws on a missing key (it returns the
 * key or a `_` fallback), so a partial catalog shows raw
 * `chelone.page.list`-style keys.
 *
 * Interpolation is single-brace `{name}` (not react-admin's `%{name}`). Plural
 * strings are `{ one, other }` objects keyed by Intl.PluralRules categories
 * (react-admin's `a |||| b` form).
 *
 * `defaultMessages` (the `chelone.*` keys the core controllers emit) and
 * `mapMessages` (the maps add-on's labels) sit underneath, and no entry here
 * repeats one of them. Where a moved key landed on a controller key that says
 * something different, the component's own key keeps the group and names the
 * role: `access_denied_detail`, `authentication_error_detail`,
 * `loading_detail` and `http_error_label` sit beside the controller's
 * `access_denied`, `authentication_error`, `loading` and `http_error`.
 */
export const englishMessages = defineMessages({
  ...defaultMessages,
  ...mapMessages,

  // Pages
  "chelone.page.list": "{name}",
  "chelone.page.create": "Create {name}",
  "chelone.page.edit": "{name} {recordRepresentation}",
  "chelone.page.show": "{name} {recordRepresentation}",
  "chelone.page.dashboard": "Dashboard",
  "chelone.page.error": "Something went wrong",
  "chelone.page.not_found": "Not Found",
  "chelone.page.loading": "Loading",
  "chelone.page.empty": "No {name} yet.",
  "chelone.page.access_denied": "Access denied",
  "chelone.page.authentication_error": "Authentication error",

  // Actions
  "chelone.action.add": "Add",
  "chelone.action.add_filter": "Add filter",
  "chelone.action.bulk_actions": {
    one: "1 item selected",
    other: "{count} items selected",
  },
  "chelone.action.cancel": "Cancel",
  "chelone.action.clear_input_value": "Clear value",
  "chelone.action.clear_search": "Clear search",
  "chelone.action.close": "Close",
  "chelone.action.close_menu": "Close menu",
  "chelone.action.confirm": "Confirm",
  "chelone.action.create": "Create",
  "chelone.action.delete": "Delete",
  "chelone.action.edit": "Edit",
  "chelone.action.export": "Export",
  "chelone.action.list": "List",
  "chelone.action.open_menu": "Open menu",
  "chelone.action.refresh": "Refresh",
  "chelone.action.remove": "Remove",
  "chelone.action.remove_filter": "Remove this filter",
  "chelone.action.save": "Save",
  "chelone.action.search": "Search",
  "chelone.action.select_all": "Select all",
  "chelone.action.select_row": "Select this row",
  "chelone.action.show": "Show",
  "chelone.action.sort": "Sort",
  "chelone.action.toggle_theme": "Toggle light/dark mode",
  "chelone.action.undo": "Undo",
  "chelone.action.unselect": "Unselect",
  "chelone.action.update": "Update",

  // Booleans
  "chelone.boolean.true": "Yes",
  "chelone.boolean.false": "No",
  "chelone.boolean.null": " ",

  // Auth (`logout` and `auth_check_error` come from `defaultMessages`)
  "chelone.auth.sign_in": "Sign in",
  "chelone.auth.sign_in_error": "Authentication failed, please retry",
  "chelone.auth.user_menu": "Profile",
  "chelone.auth.username": "Username",
  "chelone.auth.password": "Password",

  // Messages (`invalid_form` and `not_found` come from `defaultMessages`)
  "chelone.message.access_denied_detail":
    "You don't have the right permissions to access this page",
  "chelone.message.auth_error":
    "An error occurred while validating the authentication token.",
  "chelone.message.authentication_error_detail":
    "The authentication server returned an error and your credentials could not be checked.",
  "chelone.message.error":
    "A client error occurred and your request couldn't be completed.",
  "chelone.message.loading_detail": "Please wait",

  // Navigation / pagination
  "chelone.navigation.next": "Go to next page",
  "chelone.navigation.previous": "Go to previous page",
  "chelone.navigation.first": "Go to first page",
  "chelone.navigation.last": "Go to last page",
  // No `{name}`: the list and input call sites pass no params for these.
  "chelone.navigation.no_results": "No results found",
  "chelone.navigation.no_filtered_results":
    "No results found with the current filters.",
  "chelone.navigation.page_range_info": "{offsetBegin}-{offsetEnd} of {total}",
  "chelone.navigation.partial_page_range_info":
    "{offsetBegin}-{offsetEnd} of more than {offsetEnd}",
  "chelone.navigation.page_rows_per_page": "Rows per page:",
  "chelone.navigation.current_page": "Page {page}",
  "chelone.navigation.skip_nav": "Skip to content",

  // Inputs
  "chelone.input.file.upload_several":
    "Drop some files to upload, or click to select one.",
  "chelone.input.file.upload_single":
    "Drop a file to upload, or click to select it.",
  "chelone.input.image.upload_several":
    "Drop some pictures to upload, or click to select one.",
  "chelone.input.image.upload_single":
    "Drop a picture to upload, or click to select it.",
  "chelone.input.password.toggle_visible": "Hide password",
  "chelone.input.password.toggle_hidden": "Show password",

  // Theme
  "chelone.theme.light": "Light",
  "chelone.theme.dark": "Dark",
  "chelone.theme.system": "System",

  // Validation keys come from `defaultMessages`: the ported inputs read the
  // same `chelone.validation.*` keys the core controllers emit.

  // Actions the components translate beyond the base set
  "chelone.action.back": "Back",
  "chelone.action.bulk_edit_apply": {
    one: "Apply to 1 record",
    other: "Apply to {count} records",
  },
  "chelone.action.change_locale": "Change locale",
  "chelone.action.clear_array_input": "Clear the array",
  "chelone.action.clone": "Clone",
  "chelone.action.collapse": "Collapse",
  "chelone.action.expand": "Expand",
  "chelone.action.move_column_down": "Move down",
  "chelone.action.move_column_up": "Move up",
  "chelone.action.move_down": "Move down",
  "chelone.action.move_up": "Move up",
  "chelone.action.reload": "Reload",
  "chelone.action.remove_all_filters": "Remove all filters",
  "chelone.action.reset": "Reset",
  "chelone.action.reset_columns": "Reset",
  "chelone.action.search_columns": "Search columns",
  "chelone.action.select_columns": "Columns",

  // Auth
  "chelone.auth.or": "or",

  // Calendar
  "chelone.calendar.agenda": "Agenda",
  "chelone.calendar.month": "Month",
  "chelone.calendar.week": "Week",
  "chelone.calendar.next": "Next",
  "chelone.calendar.previous": "Previous",
  "chelone.calendar.today": "Today",
  "chelone.calendar.view": "View",
  "chelone.calendar.no_events": "No events",

  // CSV import
  "chelone.csv_import.back": "Back",
  "chelone.csv_import.close": "Close",
  "chelone.csv_import.complete": "Import complete",
  "chelone.csv_import.counts":
    "{created} created · {failed} failed · {total} total",
  "chelone.csv_import.download_errors": "Download error report",
  "chelone.csv_import.drop": "Drop a CSV file here, or click to choose one",
  "chelone.csv_import.import": "Import",
  "chelone.csv_import.issues": "Issues",
  "chelone.csv_import.next": "Next",
  "chelone.csv_import.not_utf8":
    "This file is not UTF-8, so some letters may be wrong. Save it as CSV UTF-8 and try again.",
  "chelone.csv_import.preview_summary":
    "{valid} valid · {errors} errors · {total} total",
  "chelone.csv_import.required_unmapped": "Required fields are not mapped",
  "chelone.csv_import.rows_parsed": "{count} rows parsed",
  "chelone.csv_import.step.commit": "Importing",
  "chelone.csv_import.step.map": "Map columns",
  "chelone.csv_import.step.preview": "Preview",
  "chelone.csv_import.step.upload": "Upload",
  "chelone.csv_import.unmapped": "Not mapped",
  "chelone.csv_import.wrong_file": "Choose a .csv file",

  // Confirmation dialogs and other messages
  "chelone.message.bulk_delete_content": {
    one: "Are you sure you want to delete this item?",
    other: "Are you sure you want to delete these {count} items?",
  },
  "chelone.message.bulk_delete_title": {
    one: "Delete 1 item",
    other: "Delete {count} items",
  },
  "chelone.message.bulk_edit_description": {
    one: "Only the fields you change are applied to the selected record.",
    other:
      "Only the fields you change are applied to the {count} selected records.",
  },
  "chelone.message.bulk_edit_nested_source":
    "Bulk edit takes flat sources only, but {source} is nested.",
  "chelone.message.bulk_update_content": {
    one: "Are you sure you want to update this item?",
    other: "Are you sure you want to update these {count} items?",
  },
  "chelone.message.bulk_update_title": {
    one: "Update 1 item",
    other: "Update {count} items",
  },
  "chelone.message.clear_array_input":
    "Are you sure you want to clear the whole array?",
  "chelone.message.delete_content":
    "Are you sure you want to delete this item?",
  "chelone.message.delete_title": "Delete {name} {recordRepresentation}",

  // More navigation
  "chelone.navigation.clear_filters": "Clear filters",

  // Notifications
  "chelone.notification.application_update_available":
    "A new version of the application is available",
  "chelone.notification.http_error_label": "Error",
  "chelone.notification.offline": "You are offline",

  // Saved queries
  "chelone.saved_queries.new_label": "Save current query",
  "chelone.saved_queries.query_name": "Query name",
  "chelone.saved_queries.remove_label_with_name": 'Remove saved query "{name}"',

  // Component labels, grouped by the component that translates them. Every
  // literal `chelone.*` key in production code is here, so a translator
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
