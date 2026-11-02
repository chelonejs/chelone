import type { CsvImportState, createCsvImportController } from "@chelone/core";
import { type InjectionKey, inject, type Ref } from "vue";

type CsvImportController = ReturnType<typeof createCsvImportController>;

/**
 * The wizard's state and the controller's actions, as `<CsvImport>` provides
 * them. `state` is a ref so a consumer stays reactive to each step.
 */
export interface CsvImportContextValue
  extends Pick<
    CsvImportController,
    "loadParsed" | "setMapping" | "next" | "back" | "cancel" | "reset"
  > {
  state: Readonly<Ref<CsvImportState>>;
}

export const CsvImportKey: InjectionKey<CsvImportContextValue> =
  Symbol("chelone-csv-import");

/** Reads the import wizard from the nearest `<CsvImport>`. */
export function useCsvImport(): CsvImportContextValue {
  const value = inject(CsvImportKey, null);
  if (!value) {
    throw new Error("useCsvImport must be used inside <CsvImport>");
  }
  return value;
}
