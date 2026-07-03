import { describe, expect, it } from "vitest";
import * as barrel from "./index";

/**
 * Barrel-completeness guard. Every public symbol MUST reach a consumer through
 * `@chelone/core`; a dropped export is invisible to `tsc` (the symbol still
 * type-checks at its definition site) yet breaks app authors at runtime.
 * P2 lost `SortPayload`/`FilterPayload` this way; P4 lost a `UseXResult` alias;
 * P5 shipped `defaultMessages` without a barrel line. This locks the surface.
 *
 * Static property access throughout (no `barrel[name]` loop) so a rename also
 * breaks the test AND biome's noDynamicNamespaceImportAccess stays happy.
 */
describe("@chelone/core barrel", () => {
  it("exports the P5 form controllers + composed controllers", () => {
    expect(barrel.createFormController).toBeTypeOf("function");
    expect(barrel.normalizeFormError).toBeTypeOf("function");
    expect(barrel.createEditFormController).toBeTypeOf("function");
    expect(barrel.createCreateFormController).toBeTypeOf("function");
  });

  it("exports the P6 FormGroups primitive (registry + reducer)", () => {
    expect(barrel.createFormGroups).toBeTypeOf("function");
    expect(barrel.reduceGroupState).toBeTypeOf("function");
  });

  it("re-exports the form-core validation-logic factory (P6 W2-T2)", () => {
    // Consumers build a custom `formOptions.validationLogic` (e.g. a filter
    // form validating on change) without a direct @tanstack/form-core dep.
    expect(barrel.revalidateLogic).toBeTypeOf("function");
  });

  it("exports the P5 field-binding + source + array primitives", () => {
    expect(barrel.createFieldBinding).toBeTypeOf("function");
    expect(barrel.defaultFormat).toBeTypeOf("function");
    expect(barrel.defaultParse).toBeTypeOf("function");
    expect(barrel.composeSource).toBeTypeOf("function");
    expect(barrel.createArraySourceScope).toBeTypeOf("function");
    expect(barrel.createRowSourceScope).toBeTypeOf("function");
    expect(barrel.createArrayBinding).toBeTypeOf("function");
    expect(barrel.rootSourceScope).toBeTypeOf("object");
  });

  it("exports the P5 validators", () => {
    expect(barrel.composeValidators).toBeTypeOf("function");
    expect(barrel.isRequired).toBeTypeOf("function");
    expect(barrel.isEmpty).toBeTypeOf("function");
    expect(barrel.required).toBeTypeOf("function");
    expect(barrel.minLength).toBeTypeOf("function");
    expect(barrel.maxLength).toBeTypeOf("function");
    expect(barrel.minValue).toBeTypeOf("function");
    expect(barrel.maxValue).toBeTypeOf("function");
    expect(barrel.number).toBeTypeOf("function");
    expect(barrel.regex).toBeTypeOf("function");
    expect(barrel.email).toBeTypeOf("function");
    expect(barrel.choices).toBeTypeOf("function");
  });

  it("exports the P5 choices controller", () => {
    expect(barrel.createChoicesController).toBeTypeOf("function");
  });

  it("exports defaultMessages — the English catalog apps spread (P5 drop guard)", () => {
    expect(barrel.defaultMessages).toBeTypeOf("object");
    // Sanity: the P5 validation keys apps rely on are present.
    expect(barrel.defaultMessages["chelone.validation.required"]).toBe(
      "Required",
    );
    expect(barrel.defaultMessages["chelone.message.invalid_form"]).toBeTypeOf(
      "string",
    );
  });

  it("exports the P6 router primitives (path utils + location parser + matcher)", () => {
    expect(barrel.createPath).toBeTypeOf("function");
    expect(barrel.joinBasename).toBeTypeOf("function");
    expect(barrel.removeDoubleSlashes).toBeTypeOf("function");
    expect(barrel.parseLocation).toBeTypeOf("function");
    expect(barrel.matchPath).toBeTypeOf("function");
  });

  it("exports the P6 runtime resource registry (W1-T2)", () => {
    expect(barrel.createResourceRegistry).toBeTypeOf("function");
    expect(barrel.computeDefinition).toBeTypeOf("function");
  });

  it("does NOT leak internal save-pipeline / hydration helpers", () => {
    expect("sanitizeEmptyValues" in barrel).toBe(false);
    expect("toFormErrorMapValue" in barrel).toBe(false);
    expect("isThenable" in barrel).toBe(false);
    expect("composeFormValidator" in barrel).toBe(false);
    expect("resolveHydrationAction" in barrel).toBe(false);
  });
});
