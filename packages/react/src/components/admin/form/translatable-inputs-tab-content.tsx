import { createLocaleSourceScope } from "@chelone/core";
import { type ReactNode, useMemo } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { FormGroupProvider } from "../../../form/group-hooks";
import { SourceContextProvider, useSourceContext } from "../../../form-context";
import { useTranslatableContext } from "../../../translatable-hooks";

export interface TranslatableInputsTabContentProps {
  locale: string;
  /** Prefix that keeps the ids and form group of two groups apart. Defaults to `""`. */
  groupKey?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * One locale's panel. Always mounted, hidden while another locale is selected,
 * so every locale validates and submits. Its inputs bind `source.locale` and
 * join the `{groupKey}{locale}` form group.
 */
export function TranslatableInputsTabContent({
  locale,
  groupKey = "",
  className,
  children,
}: TranslatableInputsTabContentProps) {
  const { selectedLocale } = useTranslatableContext();
  const parent = useSourceContext();
  const scope = useMemo(
    () => createLocaleSourceScope(parent, locale),
    [parent, locale],
  );
  return (
    <FormGroupProvider name={`${groupKey}${locale}`}>
      <TabsContent
        forceMount
        value={locale}
        // `forceMount` leaves the hiding to the caller
        hidden={locale !== selectedLocale}
        id={`translatable-content-${groupKey}${locale}`}
        aria-labelledby={`translatable-header-${groupKey}${locale}`}
        className={className}
      >
        <SourceContextProvider scope={scope}>{children}</SourceContextProvider>
      </TabsContent>
    </FormGroupProvider>
  );
}
