// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../src/docs/content/vue/differences.mdx");
const vueIndex = read("../../../packages/vue/src/index.ts");
const vueComponentsIndex = read(
  "../../../packages/vue/src/components/index.ts",
);
// `KanbanBoard` ships from the `/kanban` subpath, not the base barrel.
const vueKanbanEntry = read("../../../packages/vue/src/kanban.ts");
// The charts ship from the `/charts` subpath for the same reason.
const vueChartsEntry = read("../../../packages/vue/src/charts.ts");
// So does the inspector group ship from the `/inspector` subpath.
const vueInspectorEntry = read("../../../packages/vue/src/inspector.ts");

/** The one table row holding `needle`, so a claim can be pinned to its row. */
function rowContaining(needle: string): string {
  const row = page.split("\n").find((line) => line.includes(needle));
  if (!row) throw new Error(`no differences row holding ${needle}`);
  return row;
}

it("the differences page names registry, customRoutes, the error slot scope and the default layout", () => {
  expect(page).toMatch(/^title: "Differences from React"$/m);
  expect(page).toContain("`registry`");
  expect(page).toContain("`customRoutes`");
  expect(page).toContain("`{ error, info, reset }`");
  expect(page).toContain("`{ error, errorInfo, resetErrorBoundary }`");
  expect(page).toMatch(
    /default layout[^\n]*`#layout`|`#layout`[^\n]*default layout/,
  );
});

it("the differences page names TabbedFormTab, WizardFormStep and the Confirm events", () => {
  expect(page).toContain("`TabbedFormTab`");
  expect(page).toContain("`WizardFormStep`");
  expect(page).toContain("`confirm`");
  expect(page).toContain("`close`");
  expect(page).toContain("`onConfirm`");
  expect(page).toContain("`onClose`");
});

it("the Vue components the differences page names are exported by @chelone/vue", () => {
  const exported = `${vueIndex}\n${vueComponentsIndex}\n${vueKanbanEntry}\n${vueChartsEntry}\n${vueInspectorEntry}`;
  for (const name of [
    "Confirm",
    "BooleanField",
    "FileInput",
    "ImageInput",
    "Notification",
    "ThemeModeToggle",
    "FilterForm",
    "FieldLabelText",
    "TabbedFormTab",
    "WizardFormStep",
    "SimpleList",
    "ArrayInput",
    "TabbedShowLayout",
    "TabbedShowLayoutTab",
    "TranslatableInputs",
    "TranslatableFields",
    "RefreshIconButton",
    "BulkEditDrawer",
    "FilterLiveSearch",
    "ColumnsButton",
    "Configurable",
    "TreeList",
    "PivotGrid",
    "RecordTimeline",
    "CalendarList",
    "KanbanBoard",
    "ApprovalQueue",
    "StatusTransitionButton",
    "DualApprovalButton",
    "CommandMenu",
    "Assistant",
    "DiffViewer",
    "PermissionMatrix",
    "InPlaceEditor",
    "OnboardingTour",
    "TrendChart",
    "BarChart",
    "DonutChart",
  ]) {
    expect(page, `${name} on the page`).toMatch(new RegExp(`\`<?${name}\\b`));
    expect(exported, `${name} exported`).toMatch(new RegExp(`\\b${name}\\b`));
  }
});

it("every docs link on the differences page resolves to a page", () => {
  expect(unresolvedDocLinks(page)).toEqual([]);
  expect(page).toContain("](/docs/vue/setup)");
  expect(page).toContain("](/docs/app-config/themes");
});

it("the differences page names the chart props Vue treats differently and the crosshair tooltip", () => {
  expect(page).toContain("unovis' crosshair");
  expect(page).toContain("`@chelone/vue/charts`");
  expect(page).toContain("`@unovis/vue`");
  expect(page).toContain("`@unovis/ts`");
  expect(page).toContain("`xTickFormatter`");
  expect(page).toContain("`tooltipFormatter`");
  for (const slug of [
    "trend-chart",
    "bar-chart",
    "donut-chart",
    "metric-card",
  ]) {
    expect(page, `${slug} row`).toContain(`](/docs/ui-layout/${slug})`);
  }
});

it("the differences page gives the crosshair to the two series charts and not to the donut", () => {
  const crosshair = rowContaining("unovis' crosshair");
  expect(crosshair).toContain("`<TrendChart>` and `<BarChart>`");
  expect(crosshair).not.toContain("<DonutChart>");
  const donut = rowContaining("It has no crosshair");
  expect(donut).toContain("`Donut.selectors.segment`");
  expect(donut).toContain("](/docs/ui-layout/donut-chart)");
});

it("the differences page says the charts are an add-on and MetricCard is not", () => {
  const flat = page.replace(/\s+/g, " ");
  expect(flat).toMatch(/The charts are a third/);
  expect(flat).toMatch(/`<MetricCard>` is not part of it/);
  expect(flat).toMatch(
    /`@unovis\/ts`, where React has `@chelone\/react\/charts`/,
  );
});

it("the differences page names the Configurable editor slot and the inspector add-on", () => {
  const row = rowContaining("`<InspectorButton>`");
  expect(row).toContain("`<Configurable>` takes the `#editor` slot");
  expect(row).toContain("](/docs/ui-layout/inspector)");
  const flat = page.replace(/\s+/g, " ");
  expect(flat).toContain("`@chelone/vue/inspector`");
  expect(flat).toContain("`@dnd-kit/vue`");
  expect(flat).toContain("`@chelone/react/inspector`");
  expect(flat).toContain("`@dnd-kit/react`");
});

it("the differences page names the three Vue maps entries, the native combobox and the range input", () => {
  expect(page).toMatch(/^### Maps$/m);
  expect(page).toContain("`@chelone/vue/maps`");
  expect(page).toContain("`@chelone/vue/maps/draw`");
  expect(page).toContain("`@chelone/vue/maps/osm`");
  const flat = page.replace(/\s+/g, " ");
  expect(flat).toMatch(/native combobox/);
  expect(flat).toMatch(/native range input/);
  expect(flat).toMatch(/inline SVG icons/);
  expect(page).toContain("](/docs/app-config/maps)");
});
