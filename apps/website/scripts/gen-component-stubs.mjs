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
 *   - an install command block (`npx shadcn@latest add @chelone/<registry>`
 *     when registry-backed, else an `@chelone/react` import note)
 *   - a <PropsTable name="<Component>"/> (reads the typedoc-generated JSON)
 *   - a <ComponentPreview> only when a demo file exists on disk (never
 *     fabricated here — demos are authored in T2 / getting-started)
 *
 * HONEST-SCOPE: a stub is written ONLY when its `component` has a generated
 * props JSON (proving the component is exported from the barrel). Any entry
 * whose props JSON is missing is SKIPPED and logged — no vaporware page.
 *
 * The ~25 T2 rich-guide slugs (page-components/*, viewing/index, editing/index,
 * the whole app-config section) are intentionally NOT in this table — they are
 * hand-written in T2. This generator owns the field/input/button/layout/feedback
 * reference only.
 *
 * Idempotent + non-destructive: an existing index.mdx that does NOT carry the
 * generated marker is left untouched (so hand-written T2 pages win). Re-running
 * overwrites only files this script produced.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
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
 * Cross-checked against the @chelone/react barrel + registry.json. Slugs whose
 * component is not exported are simply absent (the DROP set from plan §2).
 */
/** @type {{slug:string,section:string,component:string,registry:string|null,title:string,desc:string}[]} */
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
  { slug: "duration-field", section: "viewing", component: "DurationField", registry: "duration-field", title: "DurationField", desc: "Renders a duration value as a readable span." },
  { slug: "email-field", section: "viewing", component: "EmailField", registry: "email-field", title: "EmailField", desc: "Renders an email address as a mailto link." },
  { slug: "file-field", section: "viewing", component: "FileField", registry: "file-field", title: "FileField", desc: "Renders a file reference as a downloadable link." },
  { slug: "function-field", section: "viewing", component: "FunctionField", registry: "function-field", title: "FunctionField", desc: "Renders whatever a render function returns for the current record." },
  { slug: "image-field", section: "viewing", component: "ImageField", registry: "image-field", title: "ImageField", desc: "Renders an image field as an <img> from its URL value." },
  { slug: "number-field", section: "viewing", component: "NumberField", registry: "number-field", title: "NumberField", desc: "Formats a numeric field using Intl.NumberFormat options." },
  { slug: "phone-field", section: "viewing", component: "PhoneField", registry: "phone-field", title: "PhoneField", desc: "Renders a phone number as a tel link." },
  { slug: "rating-field", section: "viewing", component: "RatingField", registry: "rating-field", title: "RatingField", desc: "Renders a numeric rating as a row of stars." },
  { slug: "record-field", section: "viewing", component: "RecordField", registry: "record-field", title: "RecordField", desc: "A labelled field wrapper used inside <Show> layouts." },
  { slug: "reference-array-field", section: "viewing", component: "ReferenceArrayField", registry: "reference-array-field", title: "ReferenceArrayField", desc: "Fetches many related records from an array of foreign keys." },
  { slug: "reference-field", section: "viewing", component: "ReferenceField", registry: "reference-field", title: "ReferenceField", desc: "Follows a foreign key to another resource and renders a related field." },
  { slug: "reference-many-count", section: "viewing", component: "ReferenceManyCount", registry: "reference-many-count", title: "ReferenceManyCount", desc: "Displays how many related records point back at the current record." },
  { slug: "reference-many-field", section: "viewing", component: "ReferenceManyField", registry: "reference-many-field", title: "ReferenceManyField", desc: "Fetches the records of another resource that reference this one." },
  { slug: "reference-one-field", section: "viewing", component: "ReferenceOneField", registry: "reference-one-field", title: "ReferenceOneField", desc: "Fetches the single related record on the far side of a one-to-one link." },
  { slug: "select-field", section: "viewing", component: "SelectField", registry: "select-field", title: "SelectField", desc: "Maps a stored value to its label from a list of choices." },
  { slug: "subscription-plan-field", section: "viewing", component: "SubscriptionPlanField", registry: "subscription-plan-field", title: "SubscriptionPlanField", desc: "Renders a subscription plan value as a labelled badge." },
  { slug: "text-array-field", section: "viewing", component: "TextArrayField", registry: "text-array-field", title: "TextArrayField", desc: "Renders an array of strings as a row of tags." },
  { slug: "text-field", section: "viewing", component: "TextField", registry: "text-field", title: "TextField", desc: "Displays the textual value of a field inside a <span>." },
  { slug: "url-field", section: "viewing", component: "UrlField", registry: "url-field", title: "UrlField", desc: "Renders a URL value as an anchor link." },
  { slug: "usage-meter-field", section: "viewing", component: "UsageMeterField", registry: "usage-meter-field", title: "UsageMeterField", desc: "Renders a usage-vs-quota value as a progress meter." },
  { slug: "webhook-endpoint-field", section: "viewing", component: "WebhookEndpointField", registry: "webhook-endpoint-field", title: "WebhookEndpointField", desc: "Renders a webhook endpoint's URL and status." },
  { slug: "wrapper-field", section: "viewing", component: "WrapperField", registry: "wrapper-field", title: "WrapperField", desc: "Groups several fields under a single labelled column." },
  // list controls that live in the viewing section (exported, non-rich)
  { slug: "bulk-actions-toolbar", section: "viewing", component: "BulkActionsToolbar", registry: "bulk-actions-toolbar", title: "BulkActionsToolbar", desc: "The floating toolbar shown when list rows are selected." },
  { slug: "export-button", section: "viewing", component: "ExportButton", registry: "export-button", title: "ExportButton", desc: "Exports the current list to CSV." },
  { slug: "filter-button", section: "viewing", component: "FilterButton", registry: "filter-button", title: "FilterButton", desc: "A menu button that adds filter inputs to a list." },
  { slug: "infinite-pagination", section: "viewing", component: "InfinitePagination", registry: "infinite-pagination", title: "InfinitePagination", desc: "Loads the next page of an <InfiniteList> on scroll or with a Load more button." },
  { slug: "list-pagination", section: "viewing", component: "ListPagination", registry: "list-pagination", title: "ListPagination", desc: "The page-size + prev/next pager for a list." },
  { slug: "saved-queries-list", section: "viewing", component: "SavedQueriesList", registry: "saved-queries-list", title: "SavedQueriesList", desc: "Manages named filter/sort sets, saving only a list that has a filter set." },
  { slug: "sort-button", section: "viewing", component: "SortButton", registry: "sort-button", title: "SortButton", desc: "A menu button that sorts a list by a chosen field." },
  { slug: "filter-live-form", section: "viewing", component: "FilterLiveForm", registry: null, title: "FilterLiveForm", desc: "A filter form that applies each change to the list as you type." },

  // ── editing (inputs) ─────────────────────────────────────────────────────
  { slug: "api-key-input", section: "editing", component: "ApiKeyInput", registry: "api-key-input", title: "ApiKeyInput", desc: "An input for entering/rotating a secret API key." },
  { slug: "array-input", section: "editing", component: "ArrayInput", registry: "array-input", title: "ArrayInput", desc: "Edits an array of sub-records with add/remove rows." },
  { slug: "autocomplete-array-input", section: "editing", component: "AutocompleteArrayInput", registry: "autocomplete-array-input", title: "AutocompleteArrayInput", desc: "A multi-select autocomplete for choosing several values." },
  { slug: "autocomplete-input", section: "editing", component: "AutocompleteInput", registry: "autocomplete-input", title: "AutocompleteInput", desc: "A single-select input with type-ahead over a list of choices." },
  { slug: "boolean-input", section: "editing", component: "BooleanInput", registry: "boolean-input", title: "BooleanInput", desc: "A switch that edits a boolean field." },
  { slug: "checkbox-group-input", section: "editing", component: "CheckboxGroupInput", registry: "checkbox-group-input", title: "CheckboxGroupInput", desc: "A group of checkboxes for choosing several values." },
  { slug: "color-input", section: "editing", component: "ColorInput", registry: "color-input", title: "ColorInput", desc: "A colour picker input." },
  { slug: "cron-input", section: "editing", component: "CronInput", registry: "cron-input", title: "CronInput", desc: "Builds a cron expression from a friendly schedule editor." },
  { slug: "currency-input", section: "editing", component: "CurrencyInput", registry: "currency-input", title: "CurrencyInput", desc: "A numeric input that formats and stores a currency amount." },
  { slug: "datagrid-input", section: "editing", component: "DatagridInput", registry: "datagrid-input", title: "DatagridInput", desc: "Selects records by ticking rows of a mini data table." },
  { slug: "date-input", section: "editing", component: "DateInput", registry: "date-input", title: "DateInput", desc: "A date picker input." },
  { slug: "date-time-input", section: "editing", component: "DateTimeInput", registry: "date-time-input", title: "DateTimeInput", desc: "A combined date and time picker input." },
  { slug: "duration-input", section: "editing", component: "DurationInput", registry: "duration-input", title: "DurationInput", desc: "Edits a duration value across units." },
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
  { slug: "subscription-plan-picker", section: "editing", component: "SubscriptionPlanPicker", registry: "subscription-plan-picker", title: "SubscriptionPlanPicker", desc: "Chooses a subscription plan from a set of cards." },
  { slug: "text-array-input", section: "editing", component: "TextArrayInput", registry: "text-array-input", title: "TextArrayInput", desc: "Edits an array of strings as removable tags." },
  { slug: "text-input", section: "editing", component: "TextInput", registry: "text-input", title: "TextInput", desc: "A text input bound to a record field via source." },
  { slug: "time-input", section: "editing", component: "TimeInput", registry: "time-input", title: "TimeInput", desc: "A time-of-day picker input." },
  { slug: "webhook-endpoint-input", section: "editing", component: "WebhookEndpointInput", registry: "webhook-endpoint-input", title: "WebhookEndpointInput", desc: "Edits a webhook endpoint URL and its event subscriptions." },
  // editing: shipped action buttons + form scaffolding
  { slug: "bulk-delete-button", section: "editing", component: "BulkDeleteButton", registry: "bulk-delete-button", title: "BulkDeleteButton", desc: "Deletes every selected list row (confirm-gated)." },
  { slug: "bulk-export-button", section: "editing", component: "BulkExportButton", registry: "bulk-export-button", title: "BulkExportButton", desc: "Exports the selected list rows to CSV." },
  { slug: "bulk-update-button", section: "editing", component: "BulkUpdateButton", registry: "bulk-update-button", title: "BulkUpdateButton", desc: "Applies a field update to every selected list row." },
  { slug: "cancel-button", section: "editing", component: "CancelButton", registry: "cancel-button", title: "CancelButton", desc: "Navigates back out of a form without saving." },
  { slug: "create-button", section: "editing", component: "CreateButton", registry: "create-button", title: "CreateButton", desc: "Links to the create view of the current resource." },
  { slug: "delete-button", section: "editing", component: "DeleteButton", registry: "delete-button", title: "DeleteButton", desc: "Deletes the current record (confirm-gated)." },
  { slug: "edit-button", section: "editing", component: "EditButton", registry: "edit-button", title: "EditButton", desc: "Links to the edit view of the current record." },
  { slug: "save-button", section: "editing", component: "SaveButton", registry: "save-button", title: "SaveButton", desc: "Submits the ambient form." },
  { slug: "show-button", section: "editing", component: "ShowButton", registry: "show-button", title: "ShowButton", desc: "Links to the show view of the current record." },
  { slug: "filter-form", section: "editing", component: "FilterForm", registry: "filter-form", title: "FilterForm", desc: "The inline filter inputs row shown above a list." },
  { slug: "tabbed-form", section: "editing", component: "TabbedForm", registry: null, title: "TabbedForm", desc: "Splits a create/edit form's inputs across tabs." },
  { slug: "wizard-form", section: "editing", component: "WizardForm", registry: null, title: "WizardForm", desc: "Splits a create/edit form into sequential wizard steps." },

  // ── ui-layout (shell / auth / feedback chrome) ──────────────────────────
  { slug: "access-denied", section: "ui-layout", component: "AccessDenied", registry: "access-denied", title: "AccessDenied", desc: "The splash shown when a user lacks access to a page." },
  { slug: "app-bar", section: "ui-layout", component: "AppBar", registry: "app-bar", title: "AppBar", desc: "The top application bar of the admin layout." },
  { slug: "app-sidebar", section: "ui-layout", component: "AppSidebar", registry: "app-sidebar", title: "AppSidebar", desc: "The collapsible navigation sidebar of the admin layout." },
  { slug: "auth-callback", section: "ui-layout", component: "AuthCallback", registry: "auth-callback", title: "AuthCallback", desc: "Handles the OAuth redirect callback and finishes login." },
  { slug: "auth-error", section: "ui-layout", component: "AuthError", registry: "auth-error", title: "AuthError", desc: "Displays an authentication error state." },
  { slug: "auth-layout", section: "ui-layout", component: "AuthLayout", registry: "auth-layout", title: "AuthLayout", desc: "The centred shell that wraps the login/auth pages." },
  { slug: "authentication-error", section: "ui-layout", component: "AuthenticationError", registry: "authentication-error", title: "AuthenticationError", desc: "The page shown when the session is invalid or expired." },
  { slug: "can-access", section: "ui-layout", component: "CanAccess", registry: "can-access", title: "CanAccess", desc: "Renders children when the current user may perform an action on a resource, optionally scoped to a record." },
  { slug: "confirm", section: "ui-layout", component: "Confirm", registry: "confirm", title: "Confirm", desc: "A confirmation dialog for destructive actions." },
  { slug: "dashboard-menu-item", section: "ui-layout", component: "DashboardMenuItem", registry: "dashboard-menu-item", title: "DashboardMenuItem", desc: "The sidebar entry that links to the dashboard." },
  { slug: "error", section: "ui-layout", component: "Error", registry: "error", title: "Error", desc: "The fallback UI rendered by the admin error boundary." },
  { slug: "keyboard-shortcut", section: "ui-layout", component: "KeyboardShortcut", registry: "keyboard-shortcut", title: "KeyboardShortcut", desc: "Registers and displays a keyboard shortcut hint." },
  { slug: "layout", section: "ui-layout", component: "Layout", registry: "layout", title: "Layout", desc: "The default admin shell: app bar, sidebar, and content area." },
  { slug: "linear-progress", section: "ui-layout", component: "LinearProgress", registry: "linear-progress", title: "LinearProgress", desc: "A thin indeterminate progress bar for pending work." },
  { slug: "list-button", section: "ui-layout", component: "ListButton", registry: "list-button", title: "ListButton", desc: "Links back to the list view of the current resource." },
  { slug: "loading", section: "ui-layout", component: "Loading", registry: "loading", title: "Loading", desc: "A centred loading indicator with a deferred appearance." },
  { slug: "login-form", section: "ui-layout", component: "LoginForm", registry: "login-form", title: "LoginForm", desc: "The email/password sign-in form." },
  { slug: "login-page", section: "ui-layout", component: "LoginPage", registry: "login-page", title: "LoginPage", desc: "The full login page wrapping the login form in the auth layout." },
  { slug: "logout", section: "ui-layout", component: "Logout", registry: "logout", title: "Logout", desc: "The user-menu item that signs the user out." },
  { slug: "menu", section: "ui-layout", component: "Menu", registry: "menu", title: "Menu", desc: "The resource navigation menu inside the sidebar." },
  { slug: "menu-item-link", section: "ui-layout", component: "MenuItemLink", registry: "menu-item-link", title: "MenuItemLink", desc: "A single navigation link in the sidebar menu." },
  { slug: "notification", section: "ui-layout", component: "Notification", registry: "notification", title: "Notification", desc: "Renders the app-wide toast notifications." },
  { slug: "ready", section: "ui-layout", component: "Ready", registry: "ready", title: "Ready", desc: "The welcome splash shown when no resources are registered." },
  { slug: "refresh-button", section: "ui-layout", component: "RefreshButton", registry: "refresh-button", title: "RefreshButton", desc: "Refetches the current view's data." },
  { slug: "resource-menu-item", section: "ui-layout", component: "ResourceMenuItem", registry: "resource-menu-item", title: "ResourceMenuItem", desc: "A sidebar menu entry generated from a resource." },
  { slug: "resource-menu-item-group", section: "ui-layout", component: "ResourceMenuItemGroup", registry: "resource-menu-item-group", title: "ResourceMenuItemGroup", desc: "Groups related resource menu items under a heading." },
  { slug: "sidebar-toggle-button", section: "ui-layout", component: "SidebarToggleButton", registry: "sidebar-toggle-button", title: "SidebarToggleButton", desc: "Collapses or expands the navigation sidebar." },
  { slug: "theme-mode-toggle", section: "ui-layout", component: "ThemeModeToggle", registry: "theme-mode-toggle", title: "ThemeModeToggle", desc: "Toggles between light and dark colour schemes." },
  { slug: "title", section: "ui-layout", component: "Title", registry: "title", title: "Title", desc: "Sets the page title portal for the current view." },
  { slug: "title-portal", section: "ui-layout", component: "TitlePortal", registry: "title-portal", title: "TitlePortal", desc: "The app-bar slot that renders each view's title." },
  { slug: "toolbar", section: "ui-layout", component: "Toolbar", registry: "toolbar", title: "Toolbar", desc: "The form action bar holding the save/delete buttons." },
  { slug: "user-menu", section: "ui-layout", component: "UserMenu", registry: "user-menu", title: "UserMenu", desc: "The app-bar dropdown for the signed-in user." },
];

/** Registry install command block, or the barrel-import note. */
function installBlock(registry) {
  if (registry) {
    return [
      "```bash",
      `npx shadcn@latest add @chelone/${registry}`,
      "```",
    ].join("\n");
  }
  return [
    "```tsx",
    `// Ships in the @chelone/react package — no separate install.`,
    `import { /* … */ } from "@chelone/react";`,
    "```",
  ].join("\n");
}

/** True when a demos/<*>.tsx exists for this slug (so we can embed a preview). */
function findDemo(section, slug) {
  const demoDir = resolve(CONTENT, section, slug, "demos");
  if (!existsSync(demoDir)) return null;
  const files = readdirSync(demoDir).filter((f) => f.endsWith(".tsx"));
  if (files.length === 0) return null;
  // name form the ComponentPreview expects: "<section>/<slug>/<demo-basename>"
  return `${section}/${slug}/${files[0].replace(/\.tsx$/, "")}`;
}

/**
 * MDX-safe body prose. In MDX a `<Word>` token parses as a JSX tag and breaks
 * the build, so wrap any `<Xxx>` / `<xxx>` element-like token in inline code.
 * (The frontmatter `description` is a quoted YAML string and is left raw.)
 */
function mdxSafe(text) {
  return text.replace(/<([A-Za-z][\w.-]*)>/g, "`<$1>`");
}

function page({ slug, section, component, registry, title, desc }) {
  const hasProps = existsSync(resolve(PROPS, `${component}.json`));
  const fm = ["---", `title: "${title}"`, `description: "${desc.replace(/"/g, '\\"')}"`];
  if (registry) fm.push(`registry: "${registry}"`);
  fm.push("---");

  const parts = [fm.join("\n"), MARKER, "", mdxSafe(desc), "", "## Installation", "", installBlock(registry)];

  const demo = findDemo(section, slug);
  if (demo) {
    parts.push("", "## Example", "", `<ComponentPreview name="${demo}" />`);
  }

  parts.push("", "## Props", "");
  parts.push(
    hasProps
      ? `<PropsTable name="${component}" />`
      : `Props are typed in the [\`${component}\`](https://chelone.dev) component source.`,
  );
  parts.push("");
  return parts.join("\n");
}

// Components that ARE barrel-exported but carry no `*Props` interface (they
// take no props, or type them inline). They legitimately have no generated
// props JSON, so the props-JSON gate below must not treat them as "not
// exported" — they still get a page (with the source-typed props note).
const PROPLESS_EXPORTS = new Set(["AuthCallback", "Notification", "Ready"]);

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
