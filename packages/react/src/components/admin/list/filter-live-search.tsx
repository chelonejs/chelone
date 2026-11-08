import { memo } from "react";
import { FilterLiveForm } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";
import { SearchInput, type SearchInputProps } from "../inputs/search-input";

type FilterLiveSearchProps = SearchInputProps;

/**
 * A search box that keeps the ambient list's `q` filter in sync as the user
 * types, for a sidebar or a toolbar beside a list. Takes the props of
 * `SearchInput`; `source` defaults to `q`.
 *
 * @example
 * <FilterLiveSearch placeholder="Search posts" />
 */
const FilterLiveSearch = memo(function FilterLiveSearch({
  source = "q",
  placeholder,
  ...rest
}: FilterLiveSearchProps) {
  const translate = useTranslate();
  return (
    <FilterLiveForm>
      <SearchInput
        source={source}
        placeholder={
          placeholder ?? translate("chelone.action.search", { _: "Search" })
        }
        {...rest}
      />
    </FilterLiveForm>
  );
});

export { FilterLiveSearch, type FilterLiveSearchProps };
