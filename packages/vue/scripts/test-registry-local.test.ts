// @vitest-environment node
import { expect, it } from "vitest";
// @ts-expect-error -- an untyped .mjs script
import { filterResolutionErrors } from "./test-registry-local.mjs";

it("the filter keeps TS2307 and TS2305 lines on copied .vue and .ts files", () => {
  const output = [
    "src/components/admin/admin.vue(3,22): error TS2307: Cannot find module '@/components/admin/missing.vue' or its corresponding type declarations.",
    "src/components/admin/layout/logout.vue(5,10): error TS2305: Module '../layout/icons' has no exported member 'Nope'.",
    "src/lib/utils.ts(1,20): error TS2307: Cannot find module 'clsx' or its corresponding type declarations.",
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
