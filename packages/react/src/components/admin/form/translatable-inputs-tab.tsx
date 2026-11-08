import type * as React from "react";
import { TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useFormGroup } from "../../../form/group-hooks";
import { useTranslate } from "../../../i18n-hooks";

export interface TranslatableInputsTabProps
  extends Omit<React.ComponentProps<typeof TabsTrigger>, "value" | "id"> {
  locale: string;
  /** Prefix that keeps the ids and form group of two groups apart. Defaults to `""`. */
  groupKey?: string;
}

/**
 * The tab header for one locale. Turns `text-destructive` while any input of
 * that locale's form group is invalid, even when its panel is hidden.
 */
export function TranslatableInputsTab({
  locale,
  groupKey = "",
  className,
  children,
  ...rest
}: TranslatableInputsTabProps) {
  const translate = useTranslate();
  const { isValid } = useFormGroup(`${groupKey}${locale}`);
  const fallback = locale.charAt(0).toUpperCase() + locale.slice(1);
  return (
    <TabsTrigger
      {...rest}
      value={locale}
      id={`translatable-header-${groupKey}${locale}`}
      aria-controls={`translatable-content-${groupKey}${locale}`}
      className={cn(!isValid && "text-destructive", className)}
    >
      {children ?? translate(`chelone.locales.${locale}`, { _: fallback })}
    </TabsTrigger>
  );
}
