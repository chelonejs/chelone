/**
 * shadcn `use-mobile` hook location (the `@/hooks/use-mobile` alias `sidebar.tsx`
 * and registry consumers import). Chelone already ships this hook as
 * `useIsMobile` in `compat-hooks` (the ra `useIsMobile` parity), so this file is
 * a thin re-export to keep ONE source of truth rather than a second copy that
 * could drift. Consumers get the same `<768px` viewport boolean either way.
 */
export { useIsMobile } from "../compat-hooks";
