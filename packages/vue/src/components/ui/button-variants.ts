/**
 * `buttonVariants({ variant, size, class })` — the shadcn button class recipe as
 * a pure function, the Vue analog of `@chelone/react`'s `ui/button.tsx`
 * `buttonVariants` (cva). Extracted from `button.vue` so BOTH the `<Button>`
 * primitive AND anchor-rendered nav buttons (`<CreateButton>`/`<EditButton>`/…,
 * which render a `RouterLink` — not a `<button>` — styled as a button) share the
 * one class table. Kept in a `.ts` sibling so `button.vue` stays a single
 * component file.
 */

import { cn } from "../../lib/utils";

/** The button visual variants. Mirrors shadcn's variant tokens. */
export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

/** The button size tokens. Mirrors shadcn's size tokens. */
export type ButtonSize = "default" | "sm" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
};

/** Options accepted by {@link buttonVariants}. */
export interface ButtonVariantsOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  class?: string;
}

/** Compute the shadcn button class string for a variant/size (+ extra class). */
export function buttonVariants(options: ButtonVariantsOptions = {}): string {
  const { variant = "default", size = "default", class: extra } = options;
  return cn(base, variantClasses[variant], sizeClasses[size], extra);
}
