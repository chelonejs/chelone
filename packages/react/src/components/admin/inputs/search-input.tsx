import type { LooseRecord, ResourceRecord, SourceProp } from "@chelone/core";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClearableFieldValue } from "../../../form";
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

  const translate = useTranslate();
  const { hasValue, clearFieldValue } = useClearableFieldValue(source);

  if (label) {
    throw new Error(
      "<SearchInput> isn't designed to be used with a label prop. Use <TextInput> if you need a label.",
    );
  }

  const showClearButton = !disableClearable && hasValue;

  return (
    <div className="relative mt-auto flex grow">
      <TextInput<RecordType>
        source={source}
        label={false}
        helperText={false}
        placeholder={translate("chelone.action.search")}
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
          onClick={clearFieldValue}
          className="-translate-y-1/2 absolute top-1/2 right-8 size-6 transform rounded-full p-0 text-muted-foreground"
          aria-label={translate("chelone.action.clear_search", {
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
  Omit<TextInputProps<RecordType>, "source"> & {
    /** Full-text search source. Defaults to `"q"`. */
    source?: SourceProp<RecordType>;
    disableClearable?: boolean;
  };
