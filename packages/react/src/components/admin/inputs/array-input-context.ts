import { createContext, useContext } from "react";
import type { UseArrayInputResult } from "../../../array-hooks";

/**
 * Ambient context carrying the FULL {@link UseArrayInputResult} an `<ArrayInput>`
 * built, so a form iterator (P7e `<SimpleFormIterator>`) can read `rows`, `add`,
 * `insert`, `clear`, etc. WITHOUT constructing a second array binding.
 *
 * `<ArrayInput>` owns the single `useArrayInput` binding (one binding per
 * form+source). The row-scoping context (`ArrayInputProvider` /
 * `IteratorRowProvider` from `array-hooks`) only exposes `total`/`remove`/
 * `reOrder` to a row — the iterator needs the row SET and the append/clear ops,
 * which this context provides. Kept in a sibling `.ts` file (not the component
 * `.tsx`) so the hook + context are not React-Refresh non-component exports.
 */
const ArrayInputResultContext = createContext<UseArrayInputResult | null>(null);

/**
 * The array iterator result provided by the nearest `<ArrayInput>`. Throws when
 * used outside one — a form iterator must live inside an `<ArrayInput>`.
 */
function useArrayInputResult(): UseArrayInputResult {
  const ctx = useContext(ArrayInputResultContext);
  if (!ctx) {
    throw new Error(
      "useArrayInputResult: no <ArrayInput> found above this iterator.",
    );
  }
  return ctx;
}

export { ArrayInputResultContext, useArrayInputResult };
