import type { ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";
import {
  FormGroupsProvider,
  useOptionalFormGroups,
} from "../../../form/group-hooks";
import {
  TranslatableContextProvider,
  type UseTranslatableOptions,
  useTranslatable,
} from "../../../translatable-hooks";
import { TranslatableInputsTabContent } from "./translatable-inputs-tab-content";
import { TranslatableInputsTabs } from "./translatable-inputs-tabs";

export interface TranslatableInputsProps extends UseTranslatableOptions {
  /** Replaces the default `<TranslatableInputsTabs>` locale selector. */
  selector?: ReactNode;
  /** Prefix that keeps the ids and form group of two groups apart. Defaults to `""`. */
  groupKey?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Edits one field in several locales, one tab per locale: with
 * `locales={["en", "fr"]}`, a child `<TextInput source="name" />` binds
 * `name.en` and `name.fr`. Every locale stays mounted so all of them validate
 * and submit.
 *
 * @example
 * <TranslatableInputs locales={["en", "fr"]}>
 *   <TextInput source="name" />
 * </TranslatableInputs>
 */
export function TranslatableInputs({
  locales,
  defaultLocale,
  selector,
  groupKey = "",
  className,
  children,
}: TranslatableInputsProps) {
  const translatable = useTranslatable({ locales, defaultLocale });
  const hasGroups = useOptionalFormGroups() !== undefined;
  const content = (
    <TranslatableContextProvider value={translatable}>
      <Tabs
        value={translatable.selectedLocale}
        onValueChange={translatable.selectLocale}
        className={className}
      >
        {selector ?? <TranslatableInputsTabs groupKey={groupKey} />}
        {translatable.locales.map((locale) => (
          <TranslatableInputsTabContent
            key={locale}
            locale={locale}
            groupKey={groupKey}
          >
            {children}
          </TranslatableInputsTabContent>
        ))}
      </Tabs>
    </TranslatableContextProvider>
  );
  return hasGroups ? (
    content
  ) : (
    <FormGroupsProvider>{content}</FormGroupsProvider>
  );
}
