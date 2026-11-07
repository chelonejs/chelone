/**
 * `useGetPathForRecord` — the path of the page a record links to. The Vue twin
 * of `useGetPathForRecord` in `@chelone/react`'s `nav-hooks.tsx` (parity
 * §0a-11): an explicit `link` builds that path; an omitted one infers `show`
 * when the resource has a show view and `show` access, else `edit` the same way,
 * else no link.
 *
 * Every input is a `MaybeRefOrGetter`, so a record that loads late re-evaluates
 * the path. The access checks run only while inferring, and only for a view the
 * resource registered: an explicit `link` fires no `canAccess` call.
 */

import type { CreatePathType, Identifier, ResourceRecord } from "@chelone/core";
import {
  type ComputedRef,
  computed,
  isRef,
  type MaybeRef,
  type MaybeRefOrGetter,
  toValue,
} from "vue";
import { useResourceDefinition } from "../admin/resource-registry";
import { useMenuAccess } from "../components/admin/layout/use-menu-access";
import { useCreatePath } from "./nav-composables";

/** How a record link is forced or inferred (parity §0a-11). */
export type LinkToType =
  | CreatePathType
  | false
  | ((record: ResourceRecord, resource: string) => CreatePathType | false);

export interface UseGetPathForRecordOptions {
  /** The resource the record belongs to. */
  resource: MaybeRefOrGetter<string>;
  /** The record whose id the link targets. No record (or no id) gives `false`. */
  record: MaybeRefOrGetter<ResourceRecord | undefined>;
  /**
   * An explicit link type or function, or omitted to infer show, then edit. A
   * function is the link function itself, never a getter, so a reactive `link`
   * is passed as a ref.
   */
  link?: MaybeRef<LinkToType | undefined>;
}

export function useGetPathForRecord(
  options: UseGetPathForRecordOptions,
): ComputedRef<string | false> {
  const readLink = () =>
    isRef(options.link) ? options.link.value : options.link;
  const createPath = useCreatePath();
  const definition = useResourceDefinition(() => ({
    resource: toValue(options.resource),
  }));

  const inferring = computed(
    () => readLink() == null && toValue(options.record) != null,
  );
  const showAccess = useMenuAccess(
    () => ({
      action: "show",
      resource: toValue(options.resource),
      record: toValue(options.record),
    }),
    () => inferring.value && definition.value.hasShow,
  );
  const editAccess = useMenuAccess(
    () => ({
      action: "edit",
      resource: toValue(options.resource),
      record: toValue(options.record),
    }),
    () => inferring.value && definition.value.hasEdit,
  );

  return computed(() => {
    const record = toValue(options.record);
    const id: Identifier | undefined = record?.id;
    if (record == null || id == null) return false;
    const resource = toValue(options.resource);
    const link = readLink();
    if (link === false) return false;

    if (link != null) {
      const type = typeof link === "function" ? link(record, resource) : link;
      return type === false ? false : createPath({ type, resource, id });
    }

    if (definition.value.hasShow) {
      // Wait for the show verdict rather than flash an edit link meanwhile.
      if (showAccess.isPending.value) return false;
      if (showAccess.canAccess.value) {
        return createPath({ type: "show", resource, id });
      }
    }
    if (
      definition.value.hasEdit &&
      !editAccess.isPending.value &&
      editAccess.canAccess.value
    ) {
      return createPath({ type: "edit", resource, id });
    }
    return false;
  });
}
