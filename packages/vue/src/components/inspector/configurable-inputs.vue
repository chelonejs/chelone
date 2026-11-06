<script lang="ts">
import {
  arrangeColumns,
  configurableInputColumns,
  type DataTableColumnInfo,
  defaultConfigurableInputsStoreKey,
} from "@chelone/core";
import { defineComponent, h, onMounted, onUpdated } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { flattenVNodes, keyByColumnId } from "../../lib/vnode-children";
import { useDataTableColumns } from "../../list/use-data-table-columns";
import { useResourceContext } from "../../resource-context";
import Configurable from "./configurable.vue";
import SortableFieldsSelector from "./sortable-fields-selector.vue";

/** Props for {@link ConfigurableInputs}. */
export interface ConfigurableInputsProps {
  /** The resource, used to label inputs. Defaults to the resource context. */
  resource?: string;
  /** Where the choice is stored. Defaults to `<resource>.inputs`. */
  storeKey?: string;
  /** The ids (a `source`, else a `label`) hidden until the user stores a choice. */
  defaultHiddenInputs?: string[];
  /** The panel's title while this is selected. Defaults to "Form". */
  title?: string;
  class?: string;
}

/**
 * `<ConfigurableInputs>` — wraps the inputs of an `<Edit>` or `<Create>` so a
 * user can hide the ones they never fill and put the rest in their own order
 * from the inspector. The Vue twin of `@chelone/react`'s `ConfigurableInputs`.
 *
 * It renders its default slot in the stored order, without the hidden ones, and
 * lists them in the inspector panel with a switch, a grip and move buttons. A
 * hidden input is unmounted: it shows no error, the record keeps its loaded
 * value and the resource schema still validates on save. A node with no `source`
 * or `label` is listed as `input-<index>`.
 * The drag runs on the optional `@dnd-kit/vue` peer.
 *
 * @example
 * <Edit>
 *   <ConfigurableInputs :default-hidden-inputs="['notes']">
 *     <TextInput source="title" />
 *     <TextInput source="notes" />
 *   </ConfigurableInputs>
 * </Edit>
 */
const ConfigurableInputs = defineComponent(
  (props: ConfigurableInputsProps, { slots }) => {
    const resource = useResourceContext({ resource: props.resource });
    const translate = useTranslate();
    const resolvedStoreKey = () => {
      const key =
        props.storeKey ??
        (resource ? defaultConfigurableInputsStoreKey(resource) : undefined);
      if (!key) {
        throw new Error(
          "<ConfigurableInputs> needs a resource, a storeKey or a resource context.",
        );
      }
      return key;
    };
    resolvedStoreKey();

    const { hidden, order, publish } = useDataTableColumns({
      storeKey: resolvedStoreKey,
      defaultHiddenColumns: () => props.defaultHiddenInputs,
    });

    // What the last render saw. A write to the store must not happen while
    // rendering, so it is published after the render has been patched in.
    let declared: DataTableColumnInfo[] = [];
    const report = () => publish(declared);
    onMounted(report);
    onUpdated(report);

    return () => {
      const nodes = flattenVNodes(slots.default?.() ?? []);
      // Text and static nodes (symbol types) are not inputs: they keep their
      // place, always shown, as a non-element child does in the React twin.
      const present = nodes.flatMap(({ type, props: nodeProps }) =>
        typeof type === "symbol"
          ? []
          : [{ source: nodeProps?.source, label: nodeProps?.label }],
      );
      const columns = configurableInputColumns(present).map((column) =>
        // The panel reads this flag, so it must follow the default.
        props.defaultHiddenInputs?.includes(column.id)
          ? { ...column, defaultHidden: true }
          : column,
      );
      declared = columns;
      let next = 0;
      const ids = nodes.map(({ type }) =>
        typeof type === "symbol" ? undefined : columns[next++]?.id,
      );
      const shown = arrangeColumns(ids, {
        hidden: hidden.value,
        order: order.value,
      });
      return h(
        Configurable,
        {
          preferenceKey: resolvedStoreKey(),
          title:
            props.title ??
            translate("chelone.inspector.inputs_title", { _: "Form" }),
          class: props.class,
        },
        {
          default: () => keyByColumnId(nodes, ids, shown),
          editor: () =>
            h(SortableFieldsSelector, {
              storeKey: resolvedStoreKey(),
              resource,
            }),
        },
      );
    };
  },
  {
    props: [
      "resource",
      "storeKey",
      "defaultHiddenInputs",
      "title",
      "class",
    ],
  },
);

export default ConfigurableInputs;
</script>
