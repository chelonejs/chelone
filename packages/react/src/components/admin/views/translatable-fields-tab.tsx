import type * as React from "react";
import { TabsTrigger } from "@/components/ui/tabs";
import { useTranslate } from "../../../i18n-hooks";

export interface TranslatableFieldsTabProps
  extends Omit<React.ComponentProps<typeof TabsTrigger>, "value" | "id"> {
  locale: string;
  /** Prefix that keeps the ids of two groups apart. Defaults to `""`. */
  groupKey?: string;
}

/** The tab header for one locale. */
export function TranslatableFieldsTab({
  locale,
  groupKey = "",
  children,
  ...rest
}: TranslatableFieldsTabProps) {
  const translate = useTranslate();
  const fallback = locale.charAt(0).toUpperCase() + locale.slice(1);
  return (
    <TabsTrigger
      {...rest}
      value={locale}
      id={`translatable-header-${groupKey}${locale}`}
      aria-controls={`translatable-content-${groupKey}${locale}`}
    >
      {children ?? translate(`chelone.locales.${locale}`, { _: fallback })}
    </TabsTrigger>
  );
}
