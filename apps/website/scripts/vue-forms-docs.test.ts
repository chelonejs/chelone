// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { unresolvedDocLinks } from "./docs-links";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const formsPage = read("../src/docs/content/vue/forms.mdx");

/** Value names an index file exports: `export { a, default as b }`, type-only ones left out. */
function exportedNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const block of source.matchAll(/export\s+(?!type\b)\{([^}]*)\}/g)) {
    for (const entry of block[1].split(",")) {
      const name = entry.trim();
      if (name === "" || name.startsWith("type ")) continue;
      names.add(name.split(/\s+as\s+/).pop() as string);
    }
  }
  return names;
}

it("the forms page uses TabbedFormTab and WizardFormStep, not dotted children", () => {
  expect(formsPage).toContain("<TabbedFormTab");
  expect(formsPage).toContain("<WizardFormStep");
  expect(formsPage).not.toContain("TabbedForm.Tab");
  expect(formsPage).not.toContain("WizardForm.Step");
});

it("the forms page puts the toolbar in Edit's toolbar slot", () => {
  expect(formsPage).toMatch(
    /<template #toolbar>\s*<Toolbar \/>\s*<\/template>/,
  );
});

it("the forms page shows sync-with-location false", () => {
  expect(formsPage).toContain(':sync-with-location="false"');
});

it("the forms page drives Confirm with confirm and close events", () => {
  expect(formsPage).toContain('@confirm="proceed"');
  expect(formsPage).toContain('@close="cancel"');
  expect(formsPage).not.toContain("onConfirm");
  expect(formsPage).not.toContain("onClose");
});

it("every component the forms page imports from @chelone/vue is exported", () => {
  const imported = [
    ...formsPage.matchAll(/import\s*\{([^}]*)\}\s*from\s*"@chelone\/vue"/g),
  ].flatMap((match) =>
    match[1]
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "" && !entry.startsWith("type ")),
  );
  const exported = new Set([
    ...exportedNames(read("../../../packages/vue/src/index.ts")),
    ...exportedNames(read("../../../packages/vue/src/components/index.ts")),
  ]);

  expect(imported).toContain("TabbedForm");
  expect(imported).toContain("WizardForm");
  expect(imported.filter((name) => !exported.has(name))).toEqual([]);
});

it("every docs link on the forms page resolves to a page", () => {
  expect(formsPage).toContain("](/docs/vue/setup)");
  expect(formsPage).toContain("](/docs/page-components/edit/layout)");
  expect(formsPage).toContain("](/docs/page-components/edit/advanced)");
  expect(unresolvedDocLinks(formsPage)).toEqual([]);
});
