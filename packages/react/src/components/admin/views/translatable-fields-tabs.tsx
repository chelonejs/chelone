import type * as React from "react";
import { TabsList } from "@/components/ui/tabs";
import { useTranslatableContext } from "../../../translatable-hooks";
import { TranslatableFieldsTab } from "./translatable-fields-tab";

export interface TranslatableFieldsTabsProps
  extends React.ComponentProps<typeof TabsList> {
  /** Prefix that keeps the ids of two groups apart. Defaults to `""`. */
  groupKey?: string;
}

/** The default locale selector: one tab per locale of the ambient translatable context. */
export function TranslatableFieldsTabs({
  groupKey = "",
  ...rest
}: TranslatableFieldsTabsProps) {
  const { locales } = useTranslatableContext();
  return (
    <TabsList {...rest}>
      {locales.map((locale) => (
        <TranslatableFieldsTab
          key={locale}
          locale={locale}
          groupKey={groupKey}
        />
      ))}
    </TabsList>
  );
}
