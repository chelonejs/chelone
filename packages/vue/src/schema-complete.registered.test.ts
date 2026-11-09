// @vitest-environment node

/**
 * `schema-complete.registered.test.ts`: the shipped Vue source and every `.vue`
 * component compiled in an app whose every resource has a schema, which is what
 * a codegen'd app gets (#1831) and the shape where every `source` narrows to a
 * literal path. The twin of `@chelone/react`'s file of the same name.
 *
 * `composables.registered.test.ts` compiles the `.ts` modules with resource
 * names only, on purpose: registering schemas would narrow every `source` prop,
 * and that is where these components break. Plain `tsc` cannot read a `.vue`
 * file, so this pin runs `vue-tsc` over a probe tsconfig that extends the
 * package's own and adds the probe. What fails today is counted per file
 * against `schema-complete-baseline.json`, which only shrinks.
 */
import { fileURLToPath } from "node:url";
import {
  baselineDiff,
  createProbeDir,
  type ProbeDir,
  readSchemaCompleteBaseline,
  schemaCompleteAugmentation,
  vueTscDiagnosticsOf,
} from "@chelone/test-utils/compile-probe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

/**
 * A probe tsconfig for `vue-tsc`: the package's own, plus the probe files named
 * beside it, with test files and their fixtures out because they mount fake
 * resources on purpose. Every path is relative to the probe directory, which
 * sits three levels under the package root.
 */
const probeTsconfig = (files: readonly string[]) =>
  JSON.stringify(
    {
      extends: "../../../tsconfig.json",
      compilerOptions: {
        rootDir: "../../..",
        noEmit: true,
        declaration: false,
      },
      files,
      include: ["../../../src/**/*.ts", "../../../src/**/*.vue"],
      exclude: [
        "../../../src/**/*.test.ts",
        "../../../src/**/*.test.tsx",
        "../../../src/**/*.test-d.ts",
        "../../../src/**/*.test-d.tsx",
        "../../../src/**/__fixtures__/**",
      ],
    },
    null,
    2,
  );

/** A component the baseline has never heard of, with a source no resource has. */
const unlistedComponent = `<script setup lang="ts">
import TextInput from "../../../src/components/admin/inputs/text-input.vue";
</script>

<template>
  <TextInput source="nope" />
</template>
`;

describe("the shipped Vue source in a schema-complete app", () => {
  let probeDir: ProbeDir;

  beforeAll(async () => {
    probeDir = await createProbeDir(packageRoot);
  }, 60_000);

  afterAll(async () => {
    await probeDir.dispose();
  });

  it("every Vue source compiles in an app whose every resource has a schema, less the baseline", async () => {
    await probeDir.write("register-complete.ts", schemaCompleteAugmentation);
    // A probe that only passes while the augmentation is live: an inert
    // `Register` would leave the `@ts-expect-error` unused, and TS2578 would
    // land in the diff below.
    await probeDir.write(
      "probe-complete.ts",
      `import { useGetList } from "../../../src/data/queries";
import "./register-complete";

// @ts-expect-error psots is not a registered resource name
export const bad = useGetList("psots");
`,
    );
    const tsconfig = await probeDir.write(
      "tsconfig.json",
      probeTsconfig(["./register-complete.ts", "./probe-complete.ts"]),
    );

    const diagnostics = vueTscDiagnosticsOf(packageRoot, tsconfig);
    expect(
      baselineDiff("vue", diagnostics, readSchemaCompleteBaseline()),
    ).toEqual([]);
  }, 300_000);

  it("a file the baseline does not list fails", async () => {
    await probeDir.write("register-unlisted.ts", schemaCompleteAugmentation);
    await probeDir.write("unlisted-input.vue", unlistedComponent);
    const tsconfig = await probeDir.write(
      "tsconfig-unlisted.json",
      probeTsconfig(["./register-unlisted.ts", "./unlisted-input.vue"]),
    );

    const failures = baselineDiff(
      "vue",
      vueTscDiagnosticsOf(packageRoot, tsconfig),
      readSchemaCompleteBaseline(),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("unlisted-input.vue");
    expect(failures[0]).toContain('"nope"');
  }, 300_000);
});
