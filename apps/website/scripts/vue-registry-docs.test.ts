// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const installPage = readFileSync(
  new URL(
    "../src/docs/content/getting-started/install/index.mdx",
    import.meta.url,
  ),
  "utf8",
);
const vueSection = installPage.split("## Install for Vue")[1];

it("the install page's registry URL is the one packages/vue/components.json declares", () => {
  const components = JSON.parse(
    readFileSync(
      new URL("../../../packages/vue/components.json", import.meta.url),
      "utf8",
    ),
  );
  const registrySnippet = vueSection.match(
    /```json title="components.json"\s+([\s\S]*?)```/,
  );

  expect(registrySnippet).not.toBeNull();
  expect(JSON.parse(registrySnippet![1]).registries).toEqual(
    components.registries,
  );
});

it("the install page no longer says there is no shadcn-vue registry", () => {
  expect(vueSection).not.toMatch(/There is no\s+`shadcn-vue` registry/);
  expect(vueSection).toContain("npx shadcn-vue@latest add @chelone/admin");
});
