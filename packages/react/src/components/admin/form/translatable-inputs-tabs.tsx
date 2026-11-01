import type * as React from "react";
import { TabsList } from "@/components/ui/tabs";
import { useTranslatableContext } from "../../../translatable-hooks";
import { TranslatableInputsTab } from "./translatable-inputs-tab";

export interface TranslatableInputsTabsProps
  extends React.ComponentProps<typeof TabsList> {
  /** Prefix that keeps the ids and form group of two groups apart. Defaults to `""`. */
  groupKey?: string;
}

/** The default locale selector: one tab per locale of the ambient translatable context. */
export function TranslatableInputsTabs({
  groupKey = "",
  ...rest
}: TranslatableInputsTabsProps) {
  const { locales } = useTranslatableContext();
  return (
    <TabsList {...rest}>
      {locales.map((locale) => (
        <TranslatableInputsTab
          key={locale}
          locale={locale}
          groupKey={groupKey}
        />
      ))}
    </TabsList>
  );
}
