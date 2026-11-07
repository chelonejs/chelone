import type { LooseRecord, ResourceRecord, SourceProp } from "@chelone/core";
import { Search, X } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWatch } from "../../../form";
import { useCheloneFormContext, useWrappedSource } from "../../../form-context";
import { useTranslate } from "../../../i18n-hooks";
import { TextInput, type TextInputProps } from "./text-input";

/**
 * Text input with a search icon, designed for filter forms without a label.
 *
 * It automatically uses the 'q' source for full-text search by default. Reads
 * the live value through chelone's `useWatch` shim and clears via the ambient
 * form's `setFieldValue`.
 *
 * @example
 * import { List, DataTable, SearchInput } from '@chelone/react';
 *
 * const postListFilters = [
 *   <SearchInput source="q" alwaysOn />,
 * ];
 *
 * const PostList = () => (
 *   <List filters={postListFilters}>
 *     <DataTable>
 *       <DataTable.Col source="title" />
 *     </DataTable>
 *   </List>
 * );
 */
export const SearchInput = <RecordType extends ResourceRecord = LooseRecord>(
  inProps: SearchInputProps<RecordType>,
) => {
  const { label, className, disableClearable, source = "q", ...rest } = inProps;

  const wrappedSource = useWrappedSource(source);
  const translate = useTranslate();
  const { ambient } = useCheloneFormContext().form;
  const fieldValue = useWatch({ name: source });
  const hasValue = fieldValue != null && fieldValue !== "";

  const handleClear = useCallback(() => {
    ambient.setFieldValue(wrappedSource, "");
  }, [ambient, wrappedSource]);

  if (label) {
    throw new Error(
      "<SearchInput> isn't designed to be used with a label prop. Use <TextInput> if you need a label.",
    );
  }

  const showClearButton = !disableClearable && hasValue;

  return (
    <div className="relative mt-auto flex grow">
      <TextInput
        source={source}
        label={false}
        helperText={false}
        placeholder={translate("ra.action.search")}
        className={cn("grow", className)}
        inputClassName={showClearButton ? "pr-16" : "pr-8"}
        {...rest}
      />
      <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 size-4 transform text-muted-foreground" />
      {showClearButton && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="-translate-y-1/2 absolute top-1/2 right-8 size-6 transform rounded-full p-0 text-muted-foreground"
          aria-label={translate("ra.action.clear_search", {
            _: "Clear search",
          })}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
};

export type SearchInputProps<RecordType extends ResourceRecord = LooseRecord> =
  Omit<TextInputProps, "source"> & {
    /** Full-text search source. Defaults to `"q"`. */
    source?: SourceProp<RecordType>;
    disableClearable?: boolean;
  };
