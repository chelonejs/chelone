import { memo } from "react";

/**
 * `React.memo` that preserves a component's generic signature.
 *
 * `React.memo` widens a generic function component to its non-generic
 * `MemoExoticComponent` form, dropping the `<RecordType>` type parameter the
 * field components carry. Casting the memoized value back to the original
 * component type restores call-site inference. Parity with ra-core /
 * shadmin-core's `genericMemo`.
 */
// biome-ignore lint/suspicious/noExplicitAny: a generic component type is not expressible without `any`; the cast re-narrows to the input's own type.
export const genericMemo: <T>(component: T) => T = memo as any;
