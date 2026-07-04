// The primitive base layer — the single swap point. Re-base every shadmin
// component that needs a RAW primitive (past the stock shadcn public API) by
// changing this file's source: radix-ui → base-ui → clearly. Stock shadcn
// ships no `primitives` item, so this never conflicts with a consumer's ui/.
export {
  Dialog as DialogPrimitive,
  Popover as PopoverPrimitive,
  Tooltip as TooltipPrimitive,
} from "radix-ui";
