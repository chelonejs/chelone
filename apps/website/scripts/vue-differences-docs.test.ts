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
  const exported = `${vueIndex}\n${vueComponentsIndex}`;
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
