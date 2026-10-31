// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";
// @ts-expect-error -- an untyped .mjs script
import {
  compilerRunFailure,
  filterResolutionErrors,
} from "./test-registry-local.mjs";

it("the filter keeps TS2307 and TS2305 lines on copied .vue and .ts files", () => {
  const output = [
    "src/components/admin/admin.vue(3,22): error TS2307: Cannot find module '@/components/admin/missing.vue' or its corresponding type declarations.",
    "src/components/admin/layout/logout.vue(5,10): error TS2305: Module '../layout/icons' has no exported member 'Nope'.",
    "src/lib/utils.ts(1,20): error TS2307: Cannot find module 'clsx' or its corresponding type declarations.",
    "src/components/admin/inputs/image-input.vue(2,15): error TS2614: Module './file-input.vue' has no exported member 'FileInputProps'. Did you mean to use 'import FileInputProps from \"./file-input.vue\"' instead?",
    "src/components/admin/inputs/image-input.vue(3,15): error TS2724: './file-input.vue' has no exported member named 'FileInputProp'. Did you mean 'FileInputProps'?",
    "src/components/admin/inputs/image-input.vue(4,8): error TS1192: Module './file-input.vue' has no default export.",
  ].join("\n");

  expect(filterResolutionErrors(output)).toEqual(output.split("\n"));
});

it("the filter drops other error codes and lines outside src", () => {
  const output = [
    "src/components/admin/admin.vue(3,22): error TS2322: Type 'string' is not assignable to type 'number'.",
    "src/components/admin/admin.vue(9,1): error TS2709: Cannot use namespace 'X' as a type.",
    "../node_modules/vue/index.d.ts(1,1): error TS2307: Cannot find module 'x'.",
    "temp-local-e2e/src/a.ts(1,1): error TS2307: Cannot find module 'x'.",
    "src/components/admin/admin.css(1,1): error TS2307: Cannot find module 'x'.",
    "Found 5 errors in 3 files.",
    "",
  ].join("\n");

  expect(filterResolutionErrors(output)).toEqual([]);
});

it("a compiler run that never started or reported no source diagnostics is a failure", () => {
  expect(
    compilerRunFailure({ code: "ENOENT", status: null, output: "" }),
  ).toMatch(/did not run/);
  expect(compilerRunFailure({ status: null, output: "" })).toMatch(
    /did not run/,
  );
  expect(
    compilerRunFailure({
      status: 1,
      output: "error TS18003: No inputs were found in config file.\n",
    }),
  ).toMatch(/no diagnostics/);
});

it("a compiler run that exited 0, or reported source diagnostics, is not a failure", () => {
  expect(compilerRunFailure({ status: 0, output: "" })).toBeNull();
  expect(
    compilerRunFailure({
      status: 2,
      output:
        "src/lib/utils.ts(1,1): error TS2709: Cannot use namespace 'X' as a type.\n",
    }),
  ).toBeNull();
});

const scratch: string[] = [];

afterEach(() => {
  for (const dir of scratch.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

it("the script runs when invoked through a symlinked checkout", () => {
  const root = mkdtempSync(join(tmpdir(), "registry-local-"));
  scratch.push(root);
  mkdirSync(join(root, "real", "scripts"), { recursive: true });
  copyFileSync(
    fileURLToPath(new URL("./test-registry-local.mjs", import.meta.url)),
    join(root, "real", "scripts", "test-registry-local.mjs"),
  );
  symlinkSync(join(root, "real"), join(root, "link"));

  // No dist/r beside the copy, so a script that runs must report it.
  const run = spawnSync(
    process.execPath,
    [join(root, "link", "scripts", "test-registry-local.mjs")],
    { encoding: "utf8" },
  );

  expect(run.status).toBe(1);
  expect(run.stderr).toMatch(/Missing dist item/);
});
