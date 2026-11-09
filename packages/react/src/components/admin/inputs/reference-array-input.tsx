import type {
  FilterPayload,
  LooseRecord,
  RegisteredResources,
  ResourceMap,
  ResourceRecord,
  SortPayload,
  SourceProp,
} from "@chelone/core";
import type { ReactElement, ReactNode } from "react";
import { Children, useEffect } from "react";
import {
  ChoicesContextProvider,
  useReferenceInput,
} from "../../../choices-hooks";
import { useWatch } from "../../../form";
import { ResourceContextProvider } from "../../../resource";
import { AutocompleteArrayInput } from "./autocomplete-array-input";

interface ReferenceArrayInputProps<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string,
> {
  /** The FK-array field on the current record (e.g. `"tag_ids"`). */
  source: SourceProp<RecordType>;
  /** The referenced resource choices are fetched from (e.g. `"tags"`). A registered resource name. */
  reference: TReference;
  /**
   * The field on the referenced record the values match. `"id"` (default)
   * resolves the selected records via `getMany`; any other key resolves them
   * via `getList({ filter: { [lookupKey]: values } })`.
   */
  lookupKey?: string;
  /** Permanent filter merged OVER the dynamic filter for every choices fetch. */
  filter?: FilterPayload;
  /** Sort applied to the choices query. */
  sort?: SortPayload;
  /** Choices page (1-based). */
  page?: number;
  /** Choices per page. */
  perPage?: number;
  /** Debounce delay (ms) for filter-driven choices refetches. */
  debounceMs?: number;
  /**
   * The child multi-select input rendered against the reference choices
   * context. Defaults to `<AutocompleteArrayInput>`.
   */
  children?: ReactElement;
}

/**
 * Form input for editing a to-many foreign-key relationship with
 * autocompletion.
 *
 * Fetches records from a reference resource and provides them (plus the
 * reference resource context) to a child multi-select input — by default a
 * searchable `<AutocompleteArrayInput>`. Use it to edit one-to-many or
 * many-to-many relationships where the current record carries an array of
 * foreign keys to another resource.
 *
 * The child consumes choices via the ambient `<ChoicesContextProvider>` and
 * writes an id ARRAY back to the form; server-side filtering flows through the
 * context's `setFilters`. Rebridged onto chelone's `useReferenceInput` (the
 * shared 4R choices controller — `setValue` accepts an array and resolves every
 * selected record). Changing the controller options after mount requires a
 * `key` remount.
 *
 * @example
 * import { Edit, TextInput, ReferenceArrayInput } from '@/components/admin';
 *
 * const PostEdit = () => (
 *   <Edit>
 *     <TextInput source="title" />
 *     <ReferenceArrayInput source="tag_ids" reference="tags" />
 *   </Edit>
 * );
 */
function ReferenceArrayInput<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string,
>(
  props: ReferenceArrayInputProps<RecordType, TResources, TReference>,
): ReactNode {
  const {
    children = defaultChildren,
    source,
    reference,
    lookupKey,
    filter,
    sort,
    page,
    perPage,
    debounceMs,
  } = props;

  if (Children.count(children) !== 1) {
    throw new Error(
      "<ReferenceArrayInput> only accepts a single child (like <AutocompleteArrayInput>)",
    );
  }

  const choicesContext = useReferenceInput({
    reference,
    source,
    lookupKey,
    filter,
    sort,
    page,
    perPage,
    debounceMs,
  });

  // Sync the current FK-array value on the form into the choices controller so
  // it resolves the SELECTED records (chelone's controller owns selected
  // resolution via `setValue` — getMany for an id lookup, a getList filter
  // otherwise; an array clears to `[]`). Writes flow the other way via the
  // child's `useInput`.
  const fieldValue = useWatch({ name: source });
  const { setValue } = choicesContext;
  useEffect(() => {
    setValue(fieldValue ?? []);
  }, [fieldValue, setValue]);

  return (
    <ResourceContextProvider value={reference}>
      <ChoicesContextProvider value={choicesContext}>
        {children}
      </ChoicesContextProvider>
    </ResourceContextProvider>
  );
}

const defaultChildren = <AutocompleteArrayInput />;

export { ReferenceArrayInput, type ReferenceArrayInputProps };
