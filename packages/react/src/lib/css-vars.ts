import type { CSSProperties } from "react";

/** `CSSProperties` plus any `--custom-property`, which React's type omits. */
export type CssVars = CSSProperties & {
  [K in `--${string}`]?: string | number;
};

/** Types a `style` object that carries CSS custom properties. Returns its argument. */
export function cssVars(vars: CssVars): CSSProperties {
  return vars;
}
