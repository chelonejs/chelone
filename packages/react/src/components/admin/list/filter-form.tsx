import { getAtPath } from "@chelone/core";
import { MinusCircle } from "lucide-react";
import * as React from "react";
import { isValidElement, type ReactNode, useCallback, useEffect } from "react";
import { FilterLiveForm } from "../../../form";
import { useTranslate } from "../../../i18n-hooks";
import { cn } from "../../../lib/utils";
import { useFilterContext } from "../../../list/filter-context";
import { useListFilterContext } from "../../../list/list-slice-hooks";
import { useResourceContext } from "../../../resource";
import { Button } from "../../ui/button";

interface FilterElementProps {
  source: string;
  alwaysOn?: boolean;
  defaultValue?: unknown;
  size?: string;
  label?: React.ReactNode;
  disabled?: boolean;
  resource?: string;
  record?: Record<string, unknown>;
  helperText?: React.ReactNode | false;
}

/**
 * A form for filter inputs with live updates.
 * Used with `<FilterButton>` to provide the full filtering UI.
 *
 * Ported from shadmin, rewired off chelone's `FilterLiveForm` + the list filter
 * slice (`useListFilterContext`). Chelone divergences: chelone's `FilterLiveForm`
 * owns its own `<form>` element and debounce, so shadmin's `formComponent`
 * styling wrapper + the sanitize-rest-props HTML-form passthrough are dropped;
 * the shown-filters selection logic (alwaysOn / displayed / valued) is preserved.
 */
function FilterForm(inProps: FilterFormProps) {
  const { filters: filtersProps, resource } = inProps;
  const filters = useFilterContext() || filtersProps;

  return (
    <FilterLiveForm resource={resource}>
      <div
        data-slot="filter-form"
        className={cn(
          "flex flex-col sm:flex-row justify-start items-end gap-x-2 gap-y-3 flex-wrap",
        )}
      >
        <FilterFormBase filters={filters} resource={resource} />
      </div>
    </FilterLiveForm>
  );
}

interface FilterFormProps extends FilterFormBaseProps {}

/** Selects + renders the currently-shown filter inputs off the list filter slice. */
function FilterFormBase(props: FilterFormBaseProps) {
  const { filters } = props;
  const resource = useResourceContext(props);
  const { displayedFilters, filterValues, hideFilter } = useListFilterContext();

  useEffect(() => {
    if (!filters) return;
    filters
      .filter(
        (
          filterElement,
        ): filterElement is React.ReactElement<FilterElementProps> =>
          isValidElement(filterElement),
      )
      .forEach((filter) => {
        if (filter.props.alwaysOn && filter.props.defaultValue) {
          throw new Error(
            "Cannot use alwaysOn and defaultValue on a filter input. Please use useListController({ filterDefaultValues }) instead.",
          );
        }
      });
  }, [filters]);

  const getShownFilters = () => {
    if (!filters) return [];
    const values = filterValues;
    return filters
      .filter(
        (
          filterElement,
        ): filterElement is React.ReactElement<FilterElementProps> =>
          isValidElement(filterElement),
      )
      .filter((filterElement) => {
        const filterValue = getAtPath(values, filterElement.props.source);
        return (
          filterElement.props.alwaysOn ||
          displayedFilters[filterElement.props.source] ||
          !isEmptyValue(filterValue)
        );
      });
  };

  const handleHide = useCallback(
    (event: React.MouseEvent<HTMLElement>) =>
      hideFilter(event.currentTarget.dataset.key ?? ""),
    [hideFilter],
  );

  return (
    <>
      {getShownFilters().map((filterElement) => (
        <FilterFormInput
          key={filterElement.key || filterElement.props.source}
          filterElement={filterElement}
          handleHide={handleHide}
          resource={resource}
        />
      ))}
    </>
  );
}

interface FilterFormBaseProps {
  className?: string;
  resource?: string;
  filters?: ReactNode[];
}

const isEmptyValue = (filterValue: unknown): boolean => {
  if (filterValue === "" || filterValue == null) return true;
  // A non-empty leaf anywhere makes the value non-empty.
  if (typeof filterValue === "object") {
    return Object.values(filterValue).every(isEmptyValue);
  }
  return false;
};

function FilterFormInput(inProps: FilterFormInputProps) {
  const { filterElement, handleHide, className } = inProps;
  const resource = useResourceContext(inProps);
  const translate = useTranslate();
  // chelone i18n returns the KEY when unregistered — fall back to English.
  const removeFilterRaw = translate("chelone.action.remove_filter", {});
  const removeFilterTitle =
    removeFilterRaw === "chelone.action.remove_filter"
      ? "Remove filter"
      : removeFilterRaw;

  return (
    <div
      data-source={filterElement.props.source}
      className={cn(
        "filter-field flex flex-row gap-2 relative w-full sm:w-auto",
        className,
      )}
    >
      {React.cloneElement(filterElement, {
        resource,
        record: emptyRecord,
        size: filterElement.props.size ?? "small",
        helperText: false,
        // defaultValue was already applied by the form; don't re-seed it here.
        defaultValue: undefined,
      })}
      {!filterElement.props.alwaysOn && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hide-filter size-9 cursor-pointer mt-auto"
          onClick={handleHide}
          data-key={filterElement.props.source}
          title={removeFilterTitle}
        >
          <MinusCircle className="size-4" />
        </Button>
      )}
    </div>
  );
}

interface FilterFormInputProps {
  filterElement: React.ReactElement<FilterElementProps>;
  handleHide: (event: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  resource?: string;
}

const emptyRecord = {};

export {
  FilterForm,
  FilterFormBase,
  type FilterFormBaseProps,
  FilterFormInput,
  type FilterFormInputProps,
  type FilterFormProps,
};
