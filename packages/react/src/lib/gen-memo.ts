import type { ReactNode } from "react";
import { memo } from "react";

/**
 * `React.memo` that preserves a component's generic signature.
 *
 * `React.memo` widens a generic function component to its non-generic
 * `MemoExoticComponent` form, dropping the `<RecordType>` type parameter the
 * field components carry. A higher-order signature infers the component's own
 * parameters back, so call-site inference survives. Parity with ra-core /
 * shadmin-core's `genericMemo`.
 */
export const genericMemo = <P extends object>(
  component: (props: P) => ReactNode,
): ((props: P) => ReactNode) => memo(component);
