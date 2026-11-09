// @vitest-environment node

/**
 * `schema-complete.registered.test.ts`: the shipped React source compiled in an
 * app whose every resource has a schema, which is what a codegen'd app gets
 * (#1831) and the shape where every `source` narrows to a literal path.
 *
 * `hooks.registered.test.ts` compiles the same set with resource names only, on
 * purpose: registering schemas would narrow every `source` prop, and that is
 * where these components break. What fails today is counted per file against
 * `schema-complete-baseline.json`, which only shrinks.
 */
import { fileURLToPath } from "node:url";
import {
  baselineDiff,
  createProbeDir,
  locatedDiagnosticsOf,
  type ProbeDir,
  packageProgramOf,
  readSchemaCompleteBaseline,
  schemaCompleteAugmentation,
} from "@chelone/test-utils/compile-probe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

/** A component the baseline has never heard of, with a source no resource has. */
const unlistedComponent = `import { TextInput } from "../../../src/components/admin/inputs/text-input";
import "./register-unlisted";

export const UnlistedInput = () => <TextInput source="nope" />;
`;

describe("the shipped React source in a schema-complete app", () => {
  let probeDir: ProbeDir;

  beforeAll(async () => {
    probeDir = await createProbeDir(packageRoot);
  }, 60_000);

  afterAll(async () => {
    await probeDir.dispose();
  });

  it("every React source compiles in an app whose every resource has a schema, less the baseline", async () => {
    const register = await probeDir.write(
      "register-complete.ts",
      schemaCompleteAugmentation,
    );
    const { options, sources } = packageProgramOf(packageRoot);
    expect(sources.length).toBeGreaterThan(100);

    const diagnostics = locatedDiagnosticsOf(
      [...sources, register],
      options,
      packageRoot,
    );
    expect(
      baselineDiff("react", diagnostics, readSchemaCompleteBaseline()),
    ).toEqual([]);
  }, 300_000);

  it("a file the baseline does not list fails", async () => {
    const register = await probeDir.write(
      "register-unlisted.ts",
      schemaCompleteAugmentation,
    );
    const component = await probeDir.write(
      "unlisted-input.tsx",
      unlistedComponent,
    );
    const { options, sources } = packageProgramOf(packageRoot);

    const diagnostics = locatedDiagnosticsOf(
      [...sources, register, component],
      options,
      packageRoot,
    );
    const failures = baselineDiff(
      "react",
      diagnostics,
      readSchemaCompleteBaseline(),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("unlisted-input.tsx");
    expect(failures[0]).toContain('"nope"');
  }, 300_000);
});
