#!/usr/bin/env node
/**
 * gen-component-stubs.mjs — generate THIN reference MDX pages for the shipped
 * @chelone/react component surface (P7g3-T1, Option B auto-reference).
 *
 * For every entry in STUBS below it writes
 * `src/docs/content/<section>/<slug>/index.mdx` with:
 *   - frontmatter (title, one-line description, registry:<slug> when the
 *     component ships as a shadcn-registry item)
 *   - a one-line intro
 *   - for barrel-only components, an import block for the module they are
 *     imported from (`@chelone/react`, or a row's `importFrom` add-on entry);
 *     registry-backed pages get their install block from `registry`
 *     frontmatter at render time
 *   - a <PropsTable name="<Component>"/> (reads the typedoc-generated JSON)
 *
 * `mdx-page.tsx` renders a preview when `demos/basic.tsx` exists.
 *
 * HONEST-SCOPE: a stub is written ONLY when its `component` has a generated
 * props JSON (proving the component is exported from the barrel). Any entry
 * whose props JSON is missing is SKIPPED and logged — no vaporware page.
 *
 * The ~25 T2 rich-guide slugs (page-components/*, viewing/index, editing/index,
 * the whole app-config section) are intentionally NOT in this table — they are
 * hand-written in T2. This generator owns the
 * field/input/button/layout/feedback/realtime/maps reference only.
 *
 * Idempotent + non-destructive: an existing index.mdx that does NOT carry the
 * generated marker is left untouched (so hand-written T2 pages win). Re-running
 * overwrites only files this script produced.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT = resolve(__dirname, "../src/docs/content");
const PROPS = resolve(CONTENT, "props");

// MDX comment (NOT an HTML `<!-- -->` comment — MDX rejects that). Marks a
// page as generated so re-runs may overwrite it but hand-written pages survive.
const MARKER = "{/* generated:gen-component-stubs */}";

/**
 * Curated stub table. Each row: the shadmin content slug (== chelone slug),
 * the section it lives under, the `<PropsTable>` component name (== the
 * generated props JSON basename), the registry item name (for the install
 * command; `null` => ships only in the @chelone/react barrel), a concise
 * title, and a one-line description written FRESH (no react-admin prose).
 *
 * A row may also carry `importFrom`: the module a barrel-only component is
 * imported from when it is not the barrel itself, such as an add-on entry
 * (`@chelone/react/maps/draw`). Rows without it import from `@chelone/react`.
 *
 * Cross-checked against the @chelone/react barrel + registry.json. Slugs whose
 * component is not exported are simply absent (the DROP set from plan §2).
 */
/** @type {{slug:string,section:string,component:string,registry:string|null,title:string,desc:string,importFrom?:string}[]} */
const STUBS = [
  // ── viewing (read-only fields) ──────────────────────────────────────────
  { slug: "api-key-field", section: "viewing", component: "ApiKeyField", registry: "api-key-field", title: "ApiKeyField", desc: "Renders a secret API key value, masked with a reveal/copy affordance." },
  { slug: "array-field", section: "viewing", component: "ArrayField", registry: "array-field", title: "ArrayField", desc: "Iterates an array-valued field, exposing each item to its children." },
  { slug: "badge-field", section: "viewing", component: "BadgeField", registry: "badge-field", title: "BadgeField", desc: "Renders a field value inside a coloured badge." },
  { slug: "boolean-field", section: "viewing", component: "BooleanField", registry: "boolean-field", title: "BooleanField", desc: "Renders a boolean value as a check or a cross icon." },
  { slug: "chip-field", section: "viewing", component: "ChipField", registry: "chip-field", title: "ChipField", desc: "Renders a field value as a compact chip." },
  { slug: "color-field", section: "viewing", component: "ColorField", registry: "color-field", title: "ColorField", desc: "Renders a colour value as a swatch alongside its code." },
  { slug: "cron-field", section: "viewing", component: "CronField", registry: "cron-field", title: "CronField", desc: "Renders a cron expression as a human-readable schedule." },
  { slug: "currency-field", section: "viewing", component: "CurrencyField", registry: "currency-field", title: "CurrencyField", desc: "Formats a numeric value as a localised currency amount." },
  { slug: "date-field", section: "viewing", component: "DateField", registry: "date-field", title: "DateField", desc: "Formats a date/time value using the active locale." },
  { slug: "diff-viewer", section: "viewing", component: "DiffViewer", registry: "diff-viewer", title: "DiffViewer", desc: "Shows two versions of a record, one row per field, side by side or inline. The viewer fetches nothing: it compares the `before` and `after` it is given, field by field, by deep equality. Null and undefined read as missing, and `<ins>` and `<del>` mark the values." },
  { slug: "duration-field", section: "viewing", component: "DurationField", registry: "duration-field", title: "DurationField", desc: "Renders an ISO-8601 duration string as compact (`2h 30m`) or relative text." },
  { slug: "email-field", section: "viewing", component: "EmailField", registry: "email-field", title: "EmailField", desc: "Renders an email address as a mailto link." },
  { slug: "file-field", section: "viewing", component: "FileField", registry: "file-field", title: "FileField", desc: "Renders a file reference as a downloadable link." },
  { slug: "function-field", section: "viewing", component: "FunctionField", registry: "function-field", title: "FunctionField", desc: "Renders whatever a render function returns for the current record." },
  { slug: "json-field", section: "viewing", component: "JsonField", registry: "json-field", title: "JsonField", desc: "Renders a JSON value as indented text in a <pre>, for objects, arrays and JSON strings." },
  { slug: "image-field", section: "viewing", component: "ImageField", registry: "image-field", title: "ImageField", desc: "Renders an image field as an <img> from its URL value." },
  { slug: "number-field", section: "viewing", component: "NumberField", registry: "number-field", title: "NumberField", desc: "Formats a numeric field using Intl.NumberFormat options." },
  { slug: "phone-field", section: "viewing", component: "PhoneField", registry: "phone-field", title: "PhoneField", desc: "Renders an E.164 phone number, formatted, as a `tel:` link. Set `link={false}` for plain text." },
  { slug: "rating-field", section: "viewing", component: "RatingField", registry: "rating-field", title: "RatingField", desc: "Renders a numeric rating as a row of stars." },
  { slug: "record-field", section: "viewing", component: "RecordField", registry: "record-field", title: "RecordField", desc: "A labelled field wrapper used inside <Show> layouts." },
  { slug: "labeled", section: "viewing", component: "Labeled", registry: "labeled", title: "Labeled", desc: "Labels a plain field from its source, for layouts that do not wrap each field in a <RecordField>." },
  { slug: "card-content-inner", section: "viewing", component: "CardContentInner", registry: "card-content-inner", title: "CardContentInner", desc: "One section of a <Card> with several stacked sections, so adjacent sections do not double their padding." },
  { slug: "tabbed-show-layout", section: "viewing", component: "TabbedShowLayout", registry: "tabbed-show-layout", title: "TabbedShowLayout", desc: "Groups a show view's fields into labeled tabs that follow the URL. Each <TabbedShowLayout.Tab> takes a label, path, icon and count." },
  { slug: "reference-array-field", section: "viewing", component: "ReferenceArrayField", registry: "reference-array-field", title: "ReferenceArrayField", desc: "Resolves an array of foreign keys with `getMany`, then pages, sorts and filters the result on the client." },
  { slug: "reference-field", section: "viewing", component: "ReferenceField", registry: "reference-field", title: "ReferenceField", desc: "Follows a foreign key to another resource and renders a related field." },
  { slug: "reference-many-count", section: "viewing", component: "ReferenceManyCount", registry: "reference-many-count", title: "ReferenceManyCount", desc: "Displays how many related records point back at the current record." },
  { slug: "reference-many-field", section: "viewing", component: "ReferenceManyField", registry: "reference-many-field", title: "ReferenceManyField", desc: "Fetches related records with `getManyReference`, paging, sorting and filtering on the server." },
  { slug: "reference-one-field", section: "viewing", component: "ReferenceOneField", registry: "reference-one-field", title: "ReferenceOneField", desc: "Fetches the first related record with `getManyReference` (a page of one) and renders its fields." },
  { slug: "select-field", section: "viewing", component: "SelectField", registry: "select-field", title: "SelectField", desc: "Maps a stored value to its label from a list of choices." },
  { slug: "subscription-plan-field", section: "viewing", component: "SubscriptionPlanField", registry: "subscription-plan-field", title: "SubscriptionPlanField", desc: "Renders a subscription plan value as a labelled badge." },
  { slug: "text-array-field", section: "viewing", component: "TextArrayField", registry: "text-array-field", title: "TextArrayField", desc: "Renders an array of strings as a row of tags." },
  { slug: "text-field", section: "viewing", component: "TextField", registry: "text-field", title: "TextField", desc: "Displays the textual value of a field inside a <span>." },
  { slug: "url-field", section: "viewing", component: "UrlField", registry: "url-field", title: "UrlField", desc: "Renders a URL value as an anchor link." },
  { slug: "usage-meter-field", section: "viewing", component: "UsageMeterField", registry: "usage-meter-field", title: "UsageMeterField", desc: "Renders a usage-vs-quota value as a progress meter." },
  { slug: "webhook-endpoint-field", section: "viewing", component: "WebhookEndpointField", registry: "webhook-endpoint-field", title: "WebhookEndpointField", desc: "Renders a webhook endpoint's URL and status." },
  { slug: "wrapper-field", section: "viewing", component: "WrapperField", registry: "wrapper-field", title: "WrapperField", desc: "Renders its children and nothing else. It passes `label` to a parent layout such as a data table column." },
  // list controls that live in the viewing section (exported, non-rich)
  { slug: "bulk-actions-toolbar", section: "viewing", component: "BulkActionsToolbar", registry: "bulk-actions-toolbar", title: "BulkActionsToolbar", desc: "The floating toolbar shown when list rows are selected." },
  { slug: "export-button", section: "viewing", component: "ExportButton", registry: "export-button", title: "ExportButton", desc: "Exports the current list to CSV, fetching at most `maxResults` records (default 1000)." },
  { slug: "filter-button", section: "viewing", component: "FilterButton", registry: "filter-button", title: "FilterButton", desc: "A menu button that adds filter inputs to a list." },
  { slug: "infinite-pagination", section: "viewing", component: "InfinitePagination", registry: "infinite-pagination", title: "InfinitePagination", desc: "Loads the next page of an <InfiniteList> on scroll or with a Load more button." },
  { slug: "list-pagination", section: "viewing", component: "ListPagination", registry: "list-pagination", title: "ListPagination", desc: "Pagination for a list: a range indicator, page numbers and a rows-per-page select set by `rowsPerPageOptions`." },
  { slug: "list-actions", section: "viewing", component: "ListActions", registry: "list-actions", title: "ListActions", desc: "The right-aligned row of list buttons (add filter, create, export). It is opt-in: pass it through `actions`, since `<List>` renders no default toolbar." },
  { slug: "list-toolbar", section: "viewing", component: "ListToolbar", registry: "list-toolbar", title: "ListToolbar", desc: "The bar above a list, with the filter form on the left and the actions on the right. It is opt-in: pass it through `actions`, since `<List>` renders no default toolbar." },
  { slug: "toggle-filter-button", section: "viewing", component: "ToggleFilterButton", registry: "toggle-filter-button", title: "ToggleFilterButton", desc: "A one-click button that merges a filter value into the list filter and removes it when clicked again." },
  { slug: "select-all-button", section: "viewing", component: "SelectAllButton", registry: "select-all-button", title: "SelectAllButton", desc: "Selects every row of the list up to `limit`; it hides once the selection holds `limit` ids, 250 by default." },
  { slug: "prev-next-buttons", section: "viewing", component: "PrevNextButtons", registry: "prev-next-buttons", title: "PrevNextButtons", desc: "Previous and next links that step through the records of the list the current record came from. `usePrevNextController` is the hook for building your own buttons." },
  { slug: "saved-queries-list", section: "viewing", component: "SavedQueriesList", registry: "saved-queries-list", title: "SavedQueriesList", desc: "Manages named filter/sort sets, saving only a list that has a filter set." },
  { slug: "sort-button", section: "viewing", component: "SortButton", registry: "sort-button", title: "SortButton", desc: "A menu button that sorts a list by a chosen field." },
  { slug: "columns-button", section: "viewing", component: "ColumnsButton", registry: "columns-button", title: "ColumnsButton", desc: "A button that opens a panel to show, hide and reorder the columns of a <DataTable>. It needs a `store` on <Admin>, and lists the columns the <DataTable> publishes: each one with a `source` or a string `label`." },
  { slug: "fields-selector", section: "viewing", component: "FieldsSelector", registry: "fields-selector", title: "FieldsSelector", desc: "The list of columns inside <ColumnsButton>: a switch, a label and Move up / Move down buttons per column, with a search box once there are more than five columns. `listAs` and `rowAs` replace the list around the rows and each row, so a drag add-on can wrap them without this component importing a drag package." },
  { slug: "tree-list", section: "viewing", component: "TreeList", registry: "tree-list", title: "TreeList", desc: "The records of the ambient <List> as a collapsible tree, nested by a parent field. Give the list a `perPage` that covers the whole tree: a record whose parent is on another page shows as a root." },
  { slug: "pivot-grid", section: "viewing", component: "PivotGrid", registry: "pivot-grid", title: "PivotGrid", desc: "The records of the ambient <List> as a table of rows by columns, with row, column and grand totals. The grid fetches nothing, so give the list a `perPage` that covers every record to pivot. `count`, the default, counts records; `sum`, `avg`, `min` and `max` read `valueSource` and skip values that are not numbers. A total aggregates the raw values, not the cells. A record with no row or column value lands in a `(none)` row or column." },
  { slug: "calendar-list", section: "viewing", component: "CalendarList", registry: "calendar-list", title: "CalendarList", desc: "The records of the ambient <List> as events in a month, week or agenda view. The list is filtered to the visible range with `<startSource>_gte` and `<startSource>_lte`; with `endSource` set it is `<startSource>_lte` and `<endSource>_gte`, and a record with an empty end is left out. `rangeFilter` renames the keys, and `perPage` is 1000. Dates read as local time, and a date-only value is local midnight. `onDrop` is for the month view, uses native drag and drop, and does not work on touch screens." },
  { slug: "kanban-board", section: "viewing", component: "KanbanBoard", registry: "kanban-board", title: "KanbanBoard", desc: "The records of the ambient <List> as columns, one per column definition, with a card per record. The board fetches nothing, so give the list a perPage that covers every card; a record whose group value names no column is not shown. A drop writes the target column's id to groupSource through an optimistic update: the card changes column at once, and a failed write puts the card back and notifies. A card drags only with edit access on the resource. The board imports from `/kanban` and installs dnd-kit. A card drags with mouse, touch or pen; a touch drag starts after a hold, so a swipe still scrolls the board. The `Move to` menu on each card is the keyboard path." },
  { slug: "approval-queue", section: "viewing", component: "ApprovalQueue", registry: "approval-queue", title: "ApprovalQueue", desc: "The records of the ambient <List> as a queue, one card per record with an Approve and a Reject. The queue fetches nothing: it reads the ambient `<List>`, so filter that list on the pending status, and a decided row leaves once the update's refetch lands. Approve is <DualApprovalButton>, with `required` approvals of 1 by default. Reject opens a form that asks for a reason and, on Confirm reject, writes the rejected status, the reason and the signed-in user; it needs `edit` access on the resource and an identity. A record already in the rejected status shows Rejected in place of both buttons. The rules are in the UI only, so the server has to enforce who may approve or reject." },
  { slug: "record-timeline", section: "viewing", component: "RecordTimeline", registry: "record-timeline", title: "RecordTimeline", desc: "The records of the ambient <List> as a dated activity list, one entry per record in list order. The timeline fetches nothing: put it inside a `<ReferenceManyField>` or a `<List>`, whose sort sets the order. Each entry shows the `messageSource` text, an icon, and optionally the `userSource` and the time. The time is relative (\"2 hours ago\"), from `Intl.RelativeTimeFormat`, with the full date in the tooltip and the ISO date in `dateTime`; an entry with no valid date leaves it out. `iconSource` picks an icon from `icons`, and an entry with no match shows a clock. It is computed at render and does not tick while the page stays open." },
  { slug: "job-monitor", section: "viewing", component: "JobMonitor", registry: "job-monitor", title: "JobMonitor", desc: "The jobs of a resource in one tab per status, with a count on each tab. The monitor reads its resource itself, from its `resource` prop or the context, and polls it every `pollInterval` ms, 5000 by default and `0` for no polling. It groups one page of up to `perPage` jobs, 200 by default, and a job whose status has no tab is not shown. Retry and Cancel write the status through a pessimistic update, need `edit` access on the resource, and are hidden with `actions` set to `false`. The rules are in the UI only, so the server has to refuse a retry of a job that is not failed." },
  { slug: "filter-live-form", section: "viewing", component: "FilterLiveForm", registry: null, title: "FilterLiveForm", desc: "A filter form that applies each change to the list as you type." },
  // list bodies and asides (SimpleList, FilterList, counts and live search)
  { slug: "simple-list", section: "viewing", component: "SimpleList", registry: "simple-list", title: "SimpleList", desc: "The records of the ambient <List> as tappable rows, for lists too narrow for a <DataTable>. Each row links to the edit page, or the show page when the resource has no edit view." },
  { slug: "simple-list-item", section: "viewing", component: "SimpleListItem", registry: "simple-list-item", title: "SimpleListItem", desc: "One row of a <SimpleList>, linked to the record's edit or show page. Renders nothing without a record." },
  { slug: "simple-list-loading", section: "viewing", component: "SimpleListLoading", registry: "simple-list-loading", title: "SimpleListLoading", desc: "Skeleton rows for a pending <SimpleList>. It renders nothing for the first second, so a fast response never flashes a skeleton." },
  { slug: "list-no-results", section: "viewing", component: "ListNoResults", registry: "list-no-results", title: "ListNoResults", desc: "The empty state of a list. It offers Clear filters only under an active filter." },
  { slug: "filter-list", section: "viewing", component: "FilterList", registry: "filter-list", title: "FilterList", desc: "A titled group of one-click filters for the list aside: a <FilterListSection> holding a list of <FilterListItem>s." },
  { slug: "filter-list-section", section: "viewing", component: "FilterListSection", registry: "filter-list-section", title: "FilterListSection", desc: "A titled group for the list aside: an optional icon and a translated label above its children." },
  { slug: "filter-list-item", section: "viewing", component: "FilterListItem", registry: "filter-list-item", title: "FilterListItem", desc: "A one-click filter for the list aside. It merges its `value` into the list filter, and removes it again when selected a second time." },
  { slug: "single-field-list", section: "viewing", component: "SingleFieldList", registry: "single-field-list", title: "SingleFieldList", desc: "The records of the ambient list as an inline row, each rendering its children or, by default, a badge of its record representation." },
  { slug: "count", section: "viewing", component: "Count", registry: "count", title: "Count", desc: "How many records of a resource match a filter, optionally linked to the filtered list. It needs a resource, from its `resource` prop or the context." },
  { slug: "filter-live-search", section: "viewing", component: "FilterLiveSearch", registry: "filter-live-search", title: "FilterLiveSearch", desc: "A search box that keeps the ambient list's filter in sync as the user types. `source` defaults to `q`." },

  // ── editing (inputs) ─────────────────────────────────────────────────────
  { slug: "api-key-input", section: "editing", component: "ApiKeyInput", registry: "api-key-input", title: "ApiKeyInput", desc: "A Rotate button with a confirm dialog. It is not form-bound: on confirm it sets the field to `null` through the data provider, or runs `onRotate` when given." },
  { slug: "array-input", section: "editing", component: "ArrayInput", registry: "array-input", title: "ArrayInput", desc: "Binds an array field and renders its rows through the child iterator you supply; it has no row UI of its own." },
  { slug: "autocomplete-array-input", section: "editing", component: "AutocompleteArrayInput", registry: "autocomplete-array-input", title: "AutocompleteArrayInput", desc: "A multi-select autocomplete for choosing several values." },
  { slug: "autocomplete-input", section: "editing", component: "AutocompleteInput", registry: "autocomplete-input", title: "AutocompleteInput", desc: "A single-select input with type-ahead over a list of choices." },
  { slug: "boolean-input", section: "editing", component: "BooleanInput", registry: "boolean-input", title: "BooleanInput", desc: "A switch that edits a boolean field." },
  { slug: "checkbox-group-input", section: "editing", component: "CheckboxGroupInput", registry: "checkbox-group-input", title: "CheckboxGroupInput", desc: "A group of checkboxes for choosing several values." },
  { slug: "color-input", section: "editing", component: "ColorInput", registry: "color-input", title: "ColorInput", desc: "A colour picker input." },
  { slug: "cron-input", section: "editing", component: "CronInput", registry: "cron-input", title: "CronInput", desc: "A text input for a 5-field cron expression, with a live description of the schedule beneath it." },
  { slug: "currency-input", section: "editing", component: "CurrencyInput", registry: "currency-input", title: "CurrencyInput", desc: "A numeric input that formats and stores a currency amount." },
  { slug: "datagrid-input", section: "editing", component: "DatagridInput", registry: "datagrid-input", title: "DatagridInput", desc: "Experimental. Selects records by ticking table rows; the value is an array of ids. It has no filtering or pagination." },
  { slug: "date-input", section: "editing", component: "DateInput", registry: "date-input", title: "DateInput", desc: "A date picker input." },
  { slug: "date-time-input", section: "editing", component: "DateTimeInput", registry: "date-time-input", title: "DateTimeInput", desc: "A combined date and time picker input." },
  { slug: "duration-input", section: "editing", component: "DurationInput", registry: "duration-input", title: "DurationInput", desc: "Edits a duration value across units." },
  { slug: "loading-input", section: "editing", component: "LoadingInput", registry: "loading-input", title: "LoadingInput", desc: "Holds an input's place while its data loads: a disabled input with a spinner that appears after a short delay." },
  { slug: "file-input", section: "editing", component: "FileInput", registry: "file-input", title: "FileInput", desc: "A drop-zone input for uploading files." },
  { slug: "image-input", section: "editing", component: "ImageInput", registry: "image-input", title: "ImageInput", desc: "A drop-zone input for uploading images, with previews." },
  { slug: "nullable-boolean-input", section: "editing", component: "NullableBooleanInput", registry: "nullable-boolean-input", title: "NullableBooleanInput", desc: "A three-state boolean input (true / false / unset)." },
  { slug: "number-input", section: "editing", component: "NumberInput", registry: "number-input", title: "NumberInput", desc: "A numeric text input." },
  { slug: "password-input", section: "editing", component: "PasswordInput", registry: "password-input", title: "PasswordInput", desc: "A masked password input with a reveal toggle." },
  { slug: "phone-input", section: "editing", component: "PhoneInput", registry: "phone-input", title: "PhoneInput", desc: "A telephone number input." },
  { slug: "radio-button-group-input", section: "editing", component: "RadioButtonGroupInput", registry: "radio-button-group-input", title: "RadioButtonGroupInput", desc: "A radio group for choosing one value from a list." },
  { slug: "rating-input", section: "editing", component: "RatingInput", registry: "rating-input", title: "RatingInput", desc: "A star-rating input." },
  { slug: "reference-array-input", section: "editing", component: "ReferenceArrayInput", registry: "reference-array-input", title: "ReferenceArrayInput", desc: "Chooses several related records by their foreign keys." },
  { slug: "reference-input", section: "editing", component: "ReferenceInput", registry: "reference-input", title: "ReferenceInput", desc: "Chooses a related record by its foreign key." },
  { slug: "resettable-text-input", section: "editing", component: "ResettableTextInput", registry: "resettable-text-input", title: "ResettableTextInput", desc: "A text input with a clear/reset affordance." },
  { slug: "search-input", section: "editing", component: "SearchInput", registry: "search-input", title: "SearchInput", desc: "A text input styled for list search/filtering." },
  { slug: "select-array-input", section: "editing", component: "SelectArrayInput", registry: "select-array-input", title: "SelectArrayInput", desc: "A multi-select dropdown for choosing several values." },
  { slug: "select-input", section: "editing", component: "SelectInput", registry: "select-input", title: "SelectInput", desc: "A single-select dropdown over a list of choices." },
  { slug: "simple-form-iterator", section: "editing", component: "SimpleFormIterator", registry: "simple-form-iterator", title: "SimpleFormIterator", desc: "The ready-made row UI for an ArrayInput: add, remove, reorder and a confirmed clear." },
  { slug: "subscription-plan-picker", section: "editing", component: "SubscriptionPlanPicker", registry: "subscription-plan-picker", title: "SubscriptionPlanPicker", desc: "Chooses a subscription plan from a set of cards." },
  { slug: "text-array-input", section: "editing", component: "TextArrayInput", registry: "text-array-input", title: "TextArrayInput", desc: "Edits an array of strings as removable tags." },
  { slug: "text-input", section: "editing", component: "TextInput", registry: "text-input", title: "TextInput", desc: "A text input bound to a record field via source." },
  { slug: "time-input", section: "editing", component: "TimeInput", registry: "time-input", title: "TimeInput", desc: "A time-of-day picker input." },
  { slug: "webhook-endpoint-input", section: "editing", component: "WebhookEndpointInput", registry: "webhook-endpoint-input", title: "WebhookEndpointInput", desc: "Edits a webhook endpoint URL and its event subscriptions." },
  // editing: shipped action buttons + form scaffolding
  { slug: "bulk-delete-button", section: "editing", component: "BulkDeleteButton", registry: "bulk-delete-button", title: "BulkDeleteButton", desc: "Deletes every selected list row (confirm-gated)." },
  { slug: "bulk-export-button", section: "editing", component: "BulkExportButton", registry: "bulk-export-button", title: "BulkExportButton", desc: "Exports the selected list rows to CSV." },
  { slug: "bulk-update-button", section: "editing", component: "BulkUpdateButton", registry: "bulk-update-button", title: "BulkUpdateButton", desc: "Applies a field update to every selected list row." },
  { slug: "clone-button", section: "editing", component: "CloneButton", registry: "clone-button", title: "CloneButton", desc: "Opens the create view pre-filled with a copy of the current record. It needs create access, as `<CreateButton>` does." },
  { slug: "update-button", section: "editing", component: "UpdateButton", registry: "update-button", title: "UpdateButton", desc: "Patches the current record with a fixed `data` payload. `mutationMode` defaults to `undoable`." },
  { slug: "bulk-edit-drawer", section: "editing", component: "BulkEditDrawer", registry: "bulk-edit-drawer", title: "BulkEditDrawer", desc: "Edits every selected record from a side sheet. It sends only the fields the user touched." },
  { slug: "in-place-editor", section: "editing", component: "InPlaceEditor", registry: "in-place-editor", title: "InPlaceEditor", desc: "Shows a record value and turns it into an input on click. It reads the record in context, sends only the changed fields through `update`, and makes no call when nothing changed. `Escape` cancels, and a blur cancels unless `cancelOnBlur` is false. Editing needs `edit` access to the resource. Do not put it inside an <Edit> or <Create> form: it has a form of its own." },
  { slug: "cancel-button", section: "editing", component: "CancelButton", registry: "cancel-button", title: "CancelButton", desc: "Navigates back out of a form without saving." },
  { slug: "create-button", section: "editing", component: "CreateButton", registry: "create-button", title: "CreateButton", desc: "Links to the create view of the current resource." },
  { slug: "delete-button", section: "editing", component: "DeleteButton", registry: "delete-button", title: "DeleteButton", desc: "Deletes the current record (confirm-gated)." },
  { slug: "edit-button", section: "editing", component: "EditButton", registry: "edit-button", title: "EditButton", desc: "Links to the edit view of the current record." },
  { slug: "save-button", section: "editing", component: "SaveButton", registry: "save-button", title: "SaveButton", desc: "Saves the ambient form on click. It is a click handler, not a submit button, so pressing Enter in an input does not submit." },
  { slug: "show-button", section: "editing", component: "ShowButton", registry: "show-button", title: "ShowButton", desc: "Links to the show view of the current record." },
  { slug: "filter-form", section: "editing", component: "FilterForm", registry: "filter-form", title: "FilterForm", desc: "The row of filter inputs for a list. Place it in the `actions` prop of `<List>`." },
  { slug: "tabbed-form", section: "editing", component: "TabbedForm", registry: null, title: "TabbedForm", desc: "Splits a create/edit form's inputs across tabs." },
  { slug: "wizard-form", section: "editing", component: "WizardForm", registry: null, title: "WizardForm", desc: "Splits a create/edit form into sequential wizard steps." },
  { slug: "permission-matrix", section: "editing", component: "PermissionMatrix", registry: "permission-matrix", title: "PermissionMatrix", desc: "A tab per role, each holding a resource by action grid of checkboxes over that role's grants. The value maps each role id to a `Permission[]` that `canAccessWithPermissions` reads. A cell granted by a wildcard shows as a locked checked cell. The matrix gates nothing itself: wrap it in <CanAccess> to decide who sees it. In Vue the value is a `v-model`." },

  // ── ui-layout (shell / auth / feedback chrome) ──────────────────────────
  { slug: "access-denied", section: "ui-layout", component: "AccessDenied", registry: "access-denied", title: "AccessDenied", desc: "The splash shown when a user lacks access to a page." },
  { slug: "app-bar", section: "ui-layout", component: "AppBar", registry: "app-bar", title: "AppBar", desc: "The top application bar of the admin layout." },
  { slug: "app-sidebar", section: "ui-layout", component: "AppSidebar", registry: "app-sidebar", title: "AppSidebar", desc: "The collapsible navigation sidebar of the admin layout." },
  { slug: "application-updated-notification", section: "ui-layout", component: "ApplicationUpdatedNotification", registry: "application-updated-notification", title: "ApplicationUpdatedNotification", desc: "A card pinned at the bottom centre that tells the user a new version is available, with a reload button." },
  { slug: "auth-callback", section: "ui-layout", component: "AuthCallback", registry: "auth-callback", title: "AuthCallback", desc: "Handles the OAuth redirect callback and finishes login." },
  { slug: "auth-error", section: "ui-layout", component: "AuthError", registry: "auth-error", title: "AuthError", desc: "Displays an authentication error state." },
  { slug: "auth-layout", section: "ui-layout", component: "AuthLayout", registry: "auth-layout", title: "AuthLayout", desc: "The centred shell that wraps the login/auth pages." },
  { slug: "authentication-error", section: "ui-layout", component: "AuthenticationError", registry: "authentication-error", title: "AuthenticationError", desc: "The page shown when the session is invalid or expired." },
  { slug: "bar-chart", section: "ui-layout", component: "BarChart", registry: "bar-chart", title: "BarChart", desc: "One bar per row of a `data` array, `xField` along the axis and `yField` up it. The chart fetches nothing, so pass rows you already have, and a row whose `yField` is not a finite number is a gap: no bar is drawn for it. It is an add-on: import it from `@chelone/react/charts` or `@chelone/vue/charts`, and install `recharts` for React or `@unovis/vue` and `@unovis/ts` for Vue." },
  { slug: "can-access", section: "ui-layout", component: "CanAccess", registry: "can-access", title: "CanAccess", desc: "Renders children when the current user may perform an action on a resource, optionally scoped to a record." },
  { slug: "check-for-application-update", section: "ui-layout", component: "CheckForApplicationUpdate", registry: "check-for-application-update", title: "CheckForApplicationUpdate", desc: "Polls the deployed page and shows a notification once a new build is live. Renders nothing until then." },
  { slug: "confirm", section: "ui-layout", component: "Confirm", registry: "confirm", title: "Confirm", desc: "A confirmation dialog for destructive actions." },
  { slug: "dashboard-menu-item", section: "ui-layout", component: "DashboardMenuItem", registry: "dashboard-menu-item", title: "DashboardMenuItem", desc: "The sidebar entry that links to the dashboard." },
  { slug: "data-provider-devtools", section: "ui-layout", component: "DataProviderDevtools", registry: "data-provider-devtools", title: "DataProviderDevtools", desc: "A floating panel that lists the data provider calls a log recorded: method, resource, duration and the error of a failed call. Wrap the provider with `createDataProviderLog().wrap()`, pass the wrapped one to `<Admin>`, and mount the panel with the same log in development only, since it shows params and results." },
  { slug: "donut-chart", section: "ui-layout", component: "DonutChart", registry: "donut-chart", title: "DonutChart", desc: "One slice per row of a `data` array, `labelField` naming the slice and `valueField` sizing it. The chart fetches nothing, so pass rows you already have, and a row whose `valueField` is not a number above zero is a gap: it draws no slice. It is an add-on: import it from `@chelone/react/charts` or `@chelone/vue/charts`, and install `recharts` for React or `@unovis/vue` and `@unovis/ts` for Vue." },
  { slug: "error", section: "ui-layout", component: "Error", registry: "error", title: "Error", desc: "The fallback UI rendered by the admin error boundary." },
  { slug: "hide-on-scroll", section: "ui-layout", component: "HideOnScroll", registry: "hide-on-scroll", title: "HideOnScroll", desc: "Hides its wrapper on a downward scroll past a threshold and shows it again on any upward scroll." },
  { slug: "icon-button-with-tooltip", section: "ui-layout", component: "IconButtonWithTooltip", registry: "icon-button-with-tooltip", title: "IconButtonWithTooltip", desc: "A ghost icon button with a tooltip that closes when the button is clicked." },
  { slug: "keyboard-shortcut", section: "ui-layout", component: "KeyboardShortcut", registry: "keyboard-shortcut", title: "KeyboardShortcut", desc: "Displays a shortcut as styled key glyphs. Display only: it does not register a handler." },
  { slug: "layout", section: "ui-layout", component: "Layout", registry: "layout", title: "Layout", desc: "The default admin shell: app bar, sidebar, and content area." },
  { slug: "link", section: "ui-layout", component: "Link", registry: "link", title: "Link", desc: "An admin navigation link: the router adapter's `Link` with the shared link styling." },
  { slug: "linear-progress", section: "ui-layout", component: "LinearProgress", registry: "linear-progress", title: "LinearProgress", desc: "A thin progress bar that appears after a 1 second delay. Pass `value` for a determinate bar." },
  { slug: "list-button", section: "ui-layout", component: "ListButton", registry: "list-button", title: "ListButton", desc: "Links back to the list view of the current resource." },
  { slug: "loading", section: "ui-layout", component: "Loading", registry: "loading", title: "Loading", desc: "A centred loading indicator with a deferred appearance." },
  { slug: "loading-indicator", section: "ui-layout", component: "LoadingIndicator", registry: "loading-indicator", title: "LoadingIndicator", desc: "A refresh button that shows a spinner over itself while any query or mutation is in flight." },
  { slug: "locales-menu-button", section: "ui-layout", component: "LocalesMenuButton", registry: "locales-menu-button", title: "LocalesMenuButton", desc: "The app-bar menu that switches the interface language, with each language named in its own." },
  { slug: "i18n-key-editor", section: "ui-layout", component: "I18nKeyEditor", registry: "i18n-key-editor", title: "I18nKeyEditor", desc: "A panel that lists the keys the current locale is missing, with an input per key and an export of the typed translations. The app creates a `createMissingKeyStore()`, passes `store.record` as `onMissingKey` to `createI18n`, and mounts the panel with that store. A key counts as missing even when it has a `_` fallback or the fallback locale holds it. The export is flat JSON to spread into a catalog." },
  { slug: "login-form", section: "ui-layout", component: "LoginForm", registry: "login-form", title: "LoginForm", desc: "The email/password sign-in form." },
  { slug: "login-page", section: "ui-layout", component: "LoginPage", registry: "login-page", title: "LoginPage", desc: "The full login page wrapping the login form in the auth layout." },
  { slug: "login-with-email", section: "ui-layout", component: "LoginWithEmail", registry: "login-with-email", title: "LoginWithEmail", desc: "An email/password sign-in form that takes a custom submit handler." },
  { slug: "logout", section: "ui-layout", component: "Logout", registry: "logout", title: "Logout", desc: "The user-menu item that signs the user out." },
  { slug: "menu", section: "ui-layout", component: "Menu", registry: "menu", title: "Menu", desc: "The sidebar navigation menu. Groups resources by `options.group`; compose your own with the `Menu.*` parts." },
  { slug: "menu-item-link", section: "ui-layout", component: "MenuItemLink", registry: "menu-item-link", title: "MenuItemLink", desc: "A sidebar navigation link. Optionally shows a keyboard shortcut hint and navigates on that shortcut." },
  { slug: "metric-card", section: "ui-layout", component: "MetricCard", registry: "metric-card", title: "MetricCard", desc: "A headline number with the change since the last period, all of it given to the card as props: it fetches nothing. `delta` is a ratio, so 0.05 reads as 5.0%. It ships in the base `@chelone/react` and `@chelone/vue` packages and needs no chart library." },
  { slug: "not-found", section: "ui-layout", component: "NotFound", registry: "not-found", title: "NotFound", desc: "The page for an unknown URL, for the `catchAll` slot." },
  { slug: "notification", section: "ui-layout", component: "Notification", registry: "notification", title: "Notification", desc: "Renders the app-wide toast notifications." },
  { slug: "offline", section: "ui-layout", component: "Offline", registry: "offline", title: "Offline", desc: "Shows a banner, or its children, while the browser is offline. Renders nothing online." },
  { slug: "placeholder", section: "ui-layout", component: "Placeholder", registry: "placeholder", title: "Placeholder", desc: "A muted block that holds a field's height while its value loads." },
  { slug: "ready", section: "ui-layout", component: "Ready", registry: "ready", title: "Ready", desc: "The welcome splash shown when no resources are registered." },
  { slug: "refresh-button", section: "ui-layout", component: "RefreshButton", registry: "refresh-button", title: "RefreshButton", desc: "Invalidates all queries so the active ones refetch." },
  { slug: "refresh-icon-button", section: "ui-layout", component: "RefreshIconButton", registry: "refresh-icon-button", title: "RefreshIconButton", desc: "An icon button that refreshes the active queries, as `<RefreshButton>` does." },
  { slug: "resource-menu-item", section: "ui-layout", component: "ResourceMenuItem", registry: "resource-menu-item", title: "ResourceMenuItem", desc: "A sidebar menu entry generated from a resource." },
  { slug: "resource-menu-item-group", section: "ui-layout", component: "ResourceMenuItemGroup", registry: "resource-menu-item-group", title: "ResourceMenuItemGroup", desc: "Groups related resource menu items under a heading." },
  { slug: "sidebar-toggle-button", section: "ui-layout", component: "SidebarToggleButton", registry: "sidebar-toggle-button", title: "SidebarToggleButton", desc: "Collapses or expands the navigation sidebar." },
  { slug: "skip-navigation-button", section: "ui-layout", component: "SkipNavigationButton", registry: "skip-navigation-button", title: "SkipNavigationButton", desc: "An off-screen button that lets keyboard users jump past the menu to the page content." },
  { slug: "theme-mode-toggle", section: "ui-layout", component: "ThemeModeToggle", registry: "theme-mode-toggle", title: "ThemeModeToggle", desc: "A dropdown that switches between light, dark and system themes." },
  { slug: "title", section: "ui-layout", component: "Title", registry: "title", title: "Title", desc: "Portals a page title into the app bar's `<TitlePortal>` slot." },
  { slug: "title-portal", section: "ui-layout", component: "TitlePortal", registry: "title-portal", title: "TitlePortal", desc: "The app-bar slot that renders each view's title." },
  { slug: "top-toolbar", section: "ui-layout", component: "TopToolbar", registry: "top-toolbar", title: "TopToolbar", desc: "A right-aligned row of view actions, for the `actions` prop of `<List>`." },
  { slug: "toolbar", section: "ui-layout", component: "Toolbar", registry: "toolbar", title: "Toolbar", desc: "The form action bar holding the save/delete buttons." },
  { slug: "trend-chart", section: "ui-layout", component: "TrendChart", registry: "trend-chart", title: "TrendChart", desc: "A line, or a filled area with `area`, over a `data` array: one point per row, `xField` along the axis and `yField` up it. The chart fetches nothing, so pass rows you already have, and a row whose `yField` is not a finite number is a gap in the line. It is an add-on: import it from `@chelone/react/charts` or `@chelone/vue/charts`, and install `recharts` for React or `@unovis/vue` and `@unovis/ts` for Vue." },
  { slug: "user-menu", section: "ui-layout", component: "UserMenu", registry: "user-menu", title: "UserMenu", desc: "The app-bar dropdown for the signed-in user." },
  // ── realtime ──────────────────────────────────────────────────────────
  { slug: "list-live", section: "realtime", component: "ListLive", registry: "list-live", title: "ListLive", desc: "A `<List>` that refreshes when records in its resource change or the connection returns. Takes the same props as `<List>` and needs a realtime data provider." },
  { slug: "edit-live", section: "realtime", component: "EditLive", registry: "edit-live", title: "EditLive", desc: "An `<Edit>` that refreshes the record on changes and reconnects. Holds incoming changes while the form has unsaved edits, then refetches once it is saved or reset. Needs a realtime data provider." },
  { slug: "show-live", section: "realtime", component: "ShowLive", registry: "show-live", title: "ShowLive", desc: "A `<Show>` that refreshes the record on changes and reconnects. Takes the same props as `<Show>` and needs a realtime data provider." },
  { slug: "menu-live", section: "realtime", component: "MenuLive", registry: "menu-live", title: "MenuLive", desc: "A navigation menu whose links show unread event counts for their resources. Counts new records by default and clears a link's count while its route is open. Needs a realtime data provider." },
  { slug: "presence-bar", section: "realtime", component: "PresenceBar", registry: "presence-bar", title: "PresenceBar", desc: "Shows avatars for other users viewing the same record, with a count for those beyond `maxAvatars`. Renders nothing when nobody else is present. Needs a realtime data provider." },
  { slug: "comments-thread", section: "realtime", component: "CommentsThread", registry: "comments-thread", title: "CommentsThread", desc: "Lists a record's comments and provides a box to post one through the data provider. `resolvable` adds a button to mark a comment resolved. Refreshes on comment events when the provider supports realtime." },
  { slug: "lock-on-mount", section: "realtime", component: "LockOnMount", registry: "lock-on-mount", title: "LockOnMount", desc: "Acquires a record lock while mounted and releases it on unmount. Shows its children once the lock is held, a loading placeholder while requesting it, or the holder when another identity has it. Needs a realtime data provider with lock support." },
  { slug: "lock-status", section: "realtime", component: "LockStatus", registry: "lock-status", title: "LockStatus", desc: "Shows a badge naming the record's lock holder and updates when the lock is taken or released. Renders nothing for a free record unless `renderFree` is supplied. Needs a realtime data provider with lock support." },

  // ── maps (shape fields, from the @chelone/react/maps entry) ──────────────
  // Each is `GeoJsonField` under the name of a GeoJSON type, so each page names
  // its type and says what sits behind the name. No registry item of their own:
  // they install with `@chelone/maps`, so `importFrom` is their install block.
  // A backticked name here reads as a prop, so a paint default is stated as a
  // number with the `shapeStyle` prop that changes it, never as `weight` or
  // `fillOpacity`, which are `ShapeStyle` keys and not props.
  { slug: "point-field", section: "maps", component: "PointField", registry: null, title: "PointField", desc: "Shows a GeoJSON `Point` from a record on a map as a circle marker, zoomed to `maxFitZoom`, 18 by default. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
  { slug: "multi-point-field", section: "maps", component: "MultiPointField", registry: null, title: "MultiPointField", desc: "Shows a GeoJSON `MultiPoint` from a record on a map, one circle per coordinate. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
  { slug: "line-string-field", section: "maps", component: "LineStringField", registry: null, title: "LineStringField", desc: "Shows a GeoJSON `LineString` from a record on a map as a line 3 pixels wide, which `shapeStyle` restyles. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
  { slug: "multi-line-string-field", section: "maps", component: "MultiLineStringField", registry: null, title: "MultiLineStringField", desc: "Shows a GeoJSON `MultiLineString` from a record on a map, one line per part. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
  { slug: "polygon-field", section: "maps", component: "PolygonField", registry: null, title: "PolygonField", desc: "Shows a GeoJSON `Polygon` from a record on a map, filled at 0.2 opacity and outlined 3 pixels wide, both through `shapeStyle`. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
  { slug: "multi-polygon-field", section: "maps", component: "MultiPolygonField", registry: null, title: "MultiPolygonField", desc: "Shows a GeoJSON `MultiPolygon` from a record on a map, one filled part per polygon. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
  { slug: "geometry-collection-field", section: "maps", component: "GeometryCollectionField", registry: null, title: "GeometryCollectionField", desc: "Shows a GeoJSON `GeometryCollection` from a record on a map, drawing each geometry by its own type. A collection with no coordinates shows the empty text panel. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
  { slug: "feature-field", section: "maps", component: "FeatureField", registry: null, title: "FeatureField", desc: "Shows the geometry of a GeoJSON `Feature` from a record on a map. Its `properties` are not rendered. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
  { slug: "feature-collection-field", section: "maps", component: "FeatureCollectionField", registry: null, title: "FeatureCollectionField", desc: "Shows every geometry of a GeoJSON `FeatureCollection` from a record on a map. A feature with a null geometry is left out. It is `GeoJsonField` under the name of a GeoJSON type, so it takes the same props.", importFrom: "@chelone/react/maps" },
];

/**
 * A section whose pages are pieces of one guide: the sentence linking back to
 * it, under the intro.
 */
const SECTION_GUIDE = {
  realtime: "See the [realtime guide](/docs/app-config/realtime) for provider setup and usage.",
  maps: "See the [maps guide](/docs/app-config/maps) for the subpaths, the optional packages and `MapsProvider`.",
};

/**
 * Barrel-only components have no registry item, so the page renders no install
 * block for them; this import is their only one. `importFrom` names the module
 * for a component an add-on entry exports instead of the barrel.
 */
function importBlock(component, importFrom = "@chelone/react") {
  return [
    "```tsx",
    `import { ${component} } from "${importFrom}";`,
    "```",
  ].join("\n");
}

/**
 * MDX-safe body prose. In MDX a `<Word>` token parses as a JSX tag and breaks
 * the build, so wrap any `<Xxx>` / `<xxx>` element-like token in inline code.
 * (The frontmatter `description` is a quoted YAML string and is left raw.)
 */
function mdxSafe(text) {
  return text.replace(/(?<!`)<([A-Za-z][\w.-]*)>/g, "`<$1>`");
}

function page({ component, registry, title, desc, importFrom, section }) {
  const hasProps = existsSync(resolve(PROPS, `${component}.json`));
  const fm = ["---", `title: "${title}"`, `description: "${desc.replace(/`/g, "").replace(/"/g, '\\"')}"`];
  if (registry) fm.push(`registry: "${registry}"`);
  fm.push("---");

  const parts = [fm.join("\n"), MARKER, "", mdxSafe(desc)];
  // `mdx-page.tsx` renders the install block from `registry` frontmatter.
  if (!registry)
    parts.push("", "## Installation", "", importBlock(component, importFrom));

  const guide = SECTION_GUIDE[section];
  if (guide) parts.push("", guide);

  parts.push("", "## Props", "");
  parts.push(hasProps ? `<PropsTable name="${component}" />` : PROPLESS_EXPORTS.get(component));
  parts.push("");
  return parts.join("\n");
}

// Components that ARE barrel-exported but carry no `*Props` interface (they
// take no props, or type them inline). They legitimately have no generated
// props JSON, so the props-JSON gate below must not treat them as "not
// exported" — they still get a page, with the props sentence below.
const PROPLESS_EXPORTS = new Map([
  ["AuthCallback", "`AuthCallback` takes no props."],
  [
    "Notification",
    "`Notification` forwards its props to sonner's `<Toaster>`. It defaults `richColors`, `closeButton` and `position=\"bottom-center\"`, and `theme` follows the active theme.",
  ],
  ["Ready", "`Ready` takes no props."],
]);

let written = 0;
let skipped = 0;
const perSection = {};

for (const stub of STUBS) {
  // HONEST-SCOPE: never write a page for a component with no generated props
  // JSON UNLESS it is a known propless export (barrel-verified). A typo'd or
  // truly-unexported component has neither and is skipped.
  const hasPropsJson = existsSync(resolve(PROPS, `${stub.component}.json`));
  if (!hasPropsJson && !PROPLESS_EXPORTS.has(stub.component)) {
    console.warn(
      `skip: ${stub.section}/${stub.slug} — no props JSON for ${stub.component} (not exported?)`,
    );
    skipped++;
    continue;
  }

  const dir = resolve(CONTENT, stub.section, stub.slug);
  const file = resolve(dir, "index.mdx");

  // Non-destructive: leave a hand-written (non-marker) page in place.
  if (existsSync(file)) {
    const existing = readFileSync(file, "utf-8");
    if (!existing.includes(MARKER)) {
      console.warn(`keep: ${stub.section}/${stub.slug} — hand-written page (no marker), not overwriting`);
      skipped++;
      continue;
    }
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(file, page(stub));
  written++;
  perSection[stub.section] = (perSection[stub.section] ?? 0) + 1;
}

console.log(`\nWrote ${written} stub pages (${skipped} skipped).`);
for (const [sec, n] of Object.entries(perSection).sort()) {
  console.log(`  ${sec}: ${n}`);
}
