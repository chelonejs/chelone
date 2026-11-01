import type { ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";
import {
  RecordContextProvider,
  useRecordContext,
} from "../../../record/record-context";
import { ResourceContextProvider, useResourceContext } from "../../../resource";
import {
  TranslatableContextProvider,
  type UseTranslatableOptions,
  useTranslatable,
} from "../../../translatable-hooks";
import { TranslatableFieldsTabContent } from "./translatable-fields-tab-content";
import { TranslatableFieldsTabs } from "./translatable-fields-tabs";

export interface TranslatableFieldsProps extends UseTranslatableOptions {
  /** The record to show. Defaults to the ambient record. */
  record?: Record<string, unknown>;
  /** The resource the fields belong to. Defaults to the ambient resource. */
  resource?: string;
  /** Replaces the default `<TranslatableFieldsTabs>` locale selector. */
  selector?: ReactNode;
  /** Prefix that keeps the ids of two groups apart. Defaults to `""`. */
  groupKey?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Shows one field in several locales, one tab per locale: with
 * `locales={["en", "fr"]}`, a child `<TextField source="title" />` reads
 * `title.en` and `title.fr`. Every locale stays mounted.
 *
 * @example
 * <TranslatableFields locales={["en", "fr"]}>
 *   <TextField source="title" />
 * </TranslatableFields>
 */
export function TranslatableFields({
  locales,
  defaultLocale,
  record: recordProp,
  resource: resourceProp,
  selector,
  groupKey = "",
  className,
  children,
}: TranslatableFieldsProps) {
  const record = useRecordContext({ record: recordProp });
  const resource = useResourceContext({ resource: resourceProp });
  const translatable = useTranslatable({ locales, defaultLocale });
  if (!record) {
    throw new Error(
      "<TranslatableFields> needs a record: pass a record prop or render it inside a RecordContextProvider",
    );
  }
  if (!resource) {
    throw new Error(
      "<TranslatableFields> needs a resource: pass a resource prop or render it inside a ResourceContextProvider",
    );
  }
  return (
    <ResourceContextProvider value={resource}>
      <RecordContextProvider value={record}>
        <TranslatableContextProvider value={translatable}>
          <Tabs
            value={translatable.selectedLocale}
            onValueChange={translatable.selectLocale}
            className={className}
          >
            {selector ?? <TranslatableFieldsTabs groupKey={groupKey} />}
            {translatable.locales.map((locale) => (
              <TranslatableFieldsTabContent
                key={locale}
                locale={locale}
                groupKey={groupKey}
              >
                {children}
              </TranslatableFieldsTabContent>
            ))}
          </Tabs>
        </TranslatableContextProvider>
      </RecordContextProvider>
    </ResourceContextProvider>
  );
}
