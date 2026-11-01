import { createLocaleSourceScope, getRecordForLocale } from "@chelone/core";
import {
  Children,
  Fragment,
  isValidElement,
  type ReactNode,
  useMemo,
} from "react";
import { TabsContent } from "@/components/ui/tabs";
import { SourceContextProvider, useSourceContext } from "../../../form-context";
import {
  RecordContextProvider,
  useRecordContext,
} from "../../../record/record-context";
import { useTranslatableContext } from "../../../translatable-hooks";
import { Labeled } from "./labeled";

export interface TranslatableFieldsTabContentProps {
  locale: string;
  /** Prefix that keeps the ids of two groups apart. Defaults to `""`. */
  groupKey?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * One locale's panel. Always mounted, hidden while another locale is selected.
 * Its fields read the ambient record with every translation map replaced by
 * this locale's value. With several children, each element is labeled from its
 * own `source`.
 */
export function TranslatableFieldsTabContent({
  locale,
  groupKey = "",
  className,
  children,
}: TranslatableFieldsTabContentProps) {
  const { selectedLocale } = useTranslatableContext();
  const record = useRecordContext();
  const parent = useSourceContext();
  const scope = useMemo(
    () => createLocaleSourceScope(parent, locale),
    [parent, locale],
  );
  const localeRecord = useMemo(
    () => getRecordForLocale(record, locale),
    [record, locale],
  );
  const items = Children.toArray(children);
  const labelEach = items.length > 1;
  return (
    <TabsContent
      forceMount
      value={locale}
      // `forceMount` leaves the hiding to the caller
      hidden={locale !== selectedLocale}
      id={`translatable-content-${groupKey}${locale}`}
      aria-labelledby={`translatable-header-${groupKey}${locale}`}
      className={className}
    >
      <RecordContextProvider value={localeRecord}>
        <SourceContextProvider scope={scope}>
          {labelEach
            ? items.map((item, index) =>
                isValidElement(item) ? (
                  <Labeled key={item.key ?? index}>{item}</Labeled>
                ) : (
                  <Fragment key={`text-${index}`}>{item}</Fragment>
                ),
              )
            : children}
        </SourceContextProvider>
      </RecordContextProvider>
    </TabsContent>
  );
}
