/**
 * The ambient tabbed-form controller, the twin of `@chelone/react`'s
 * `TabbedFormContext`. `<TabbedForm>` provides it; headers, panels and custom
 * navigation read it with {@link useTabbedFormContext}.
 */

import { type InjectionKey, inject, provide, type Ref } from "vue";

/** The headless tabbed-form controller surface. */
export interface UseTabbedFormResult {
  /** The name of the visible tab. */
  activeTab: Readonly<Ref<string>>;
  /** Whether the tabs are URL-synced (`true`) or held locally (`false`). */
  syncWithLocation: boolean;
  /** Show the named tab. Unknown names are ignored. */
  goToTab(name: string): void;
  /** Submit the whole form: collects values from EVERY (mounted) tab. */
  submit(): Promise<void>;
}

export const TabbedFormContextKey: InjectionKey<UseTabbedFormResult> = Symbol(
  "chelone-tabbed-form-context",
);

/** Provide the controller to the tab subtree (called by `<TabbedForm>`). */
export function provideTabbedForm(value: UseTabbedFormResult): void {
  provide(TabbedFormContextKey, value);
}

/** The ambient tabbed-form controller; throws outside a `<TabbedForm>`. */
export function useTabbedFormContext(): UseTabbedFormResult {
  const ctx = inject(TabbedFormContextKey, null);
  if (!ctx) {
    throw new Error(
      "useTabbedFormContext: no <TabbedForm> found above this component.",
    );
  }
  return ctx;
}
