import type { CsvImportState, createCsvImportController } from "@chelone/core";
import { createContext, useContext } from "react";

type CsvImportController = ReturnType<typeof createCsvImportController>;

/** The wizard's state and the controller's actions, as `<CsvImport>` publishes them. */
export interface CsvImportContextValue
  extends Pick<
    CsvImportController,
    "loadParsed" | "setMapping" | "next" | "back" | "cancel" | "reset"
  > {
  state: CsvImportState;
}

export const CsvImportContext = createContext<CsvImportContextValue | null>(
  null,
);

/** Reads the import wizard from the nearest `<CsvImport>`. */
export function useCsvImport(): CsvImportContextValue {
  const value = useContext(CsvImportContext);
  if (!value) {
    throw new Error("useCsvImport must be used inside <CsvImport>");
  }
  return value;
}
