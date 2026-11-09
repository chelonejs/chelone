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
import { AutocompleteInput } from "./autocomplete-input";

interface ReferenceInputProps<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string,
> {
  /** The FK field on the current record (e.g. `"company_id"`). */
  source: SourceProp<RecordType>;
  /** The referenced resource choices are fetched from (e.g. `"companies"`). A registered resource name. */
  reference: TReference;
  /**
   * The field on the referenced record the value matches. `"id"` (default)
   * resolves the selected record via `getMany`; any other key resolves it via
   * `getList({ filter: { [lookupKey]: value } })`.
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
   * The child input rendered against the reference choices context. Defaults to
   * `<AutocompleteInput>`.
   */
  children?: ReactElement;
  /**
   * `<ReferenceInput>` does not accept a validate prop — set `validate` on the
   * child input instead (the child owns the form binding).
   */
  validate?: never;
}

/**
 * Form input for editing a to-one foreign-key relationship with autocompletion.
 *
 * Fetches records from a reference resource and provides them (plus the
 * reference resource context) to a child input — by default a searchable
 * `<AutocompleteInput>`. Use it to edit many-to-one relationships where the
 * current record carries a foreign key to another resource.
 *
 * The child consumes the choices via the ambient `<ChoicesContextProvider>`;
 * server-side filtering flows through the context's `setFilters`. Rebridged
 * onto chelone's `useReferenceInput` (the 4R choices controller): the reference
 * resource, `lookupKey`, `sort`, `filter`, and pagination are controller
 * options; changing them after mount requires a `key` remount.
 *
 * @example
 * import { Edit, TextInput, ReferenceInput } from '@/components/admin';
 *
 * const ContactEdit = () => (
 *   <Edit>
 *     <TextInput source="first_name" />
 *     <ReferenceInput source="company_id" reference="companies" />
 *   </Edit>
 * );
 */
function ReferenceInput<
  RecordType extends ResourceRecord = LooseRecord,
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string,
>(props: ReferenceInputProps<RecordType, TResources, TReference>): ReactNode {
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

  if (props.validate) {
    throw new Error(
      "<ReferenceInput> does not accept a validate prop. Set the validate prop on the child instead.",
    );
  }

  if (Children.count(children) !== 1) {
    throw new Error(
      "<ReferenceInput> only accepts a single child (like <AutocompleteInput>)",
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

  // Sync the current FK value on the form into the choices controller so it
  // resolves the SELECTED record (chelone's controller owns selected resolution
  // via `setValue` — getMany for an id lookup, a getList filter otherwise).
  // The child input reads/writes the value; this reflects reads INTO the
  // controller (writes flow the other way via the child's `useInput`).
  const fieldValue = useWatch({ name: source });
  const { setValue } = choicesContext;
  useEffect(() => {
    setValue(fieldValue ?? null);
  }, [fieldValue, setValue]);

  return (
    <ResourceContextProvider value={reference}>
      <ChoicesContextProvider value={choicesContext}>
        {children}
      </ChoicesContextProvider>
    </ResourceContextProvider>
  );
}

const defaultChildren = <AutocompleteInput />;

export { ReferenceInput, type ReferenceInputProps };
