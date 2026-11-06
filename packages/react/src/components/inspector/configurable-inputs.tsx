/**
 * `<ConfigurableInputs>` — wraps the inputs of an `<Edit>` or `<Create>` so a
 * user can hide the ones they never fill and put the rest in their own order
 * from the inspector. Ported from shadmin's `SimpleFormConfigurable`; chelone
 * has no `<SimpleForm>`, so this wraps the inputs themselves.
 */

import {
  arrangeColumns,
  configurableInputColumns,
  defaultConfigurableInputsStoreKey,
} from "@chelone/core";
import { Children, isValidElement, type ReactNode, useEffect } from "react";
import { useDataTableColumns } from "../../data-table-columns-hooks";
import { useTranslate } from "../../i18n-hooks";
import { useResourceContext } from "../../resource";
import { Configurable } from "./configurable";
import { SortableFieldsSelector } from "./sortable-fields-selector";

type InputProps = Parameters<typeof configurableInputColumns>[0][number];

interface ConfigurableInputsProps {
  /** The inputs. Each one's `source` (or `label`) names it in the panel. */
  children: ReactNode;
  /** The resource, used to label inputs. Defaults to the resource context. */
  resource?: string;
  /** Where the choice is stored. Defaults to `<resource>.inputs`. */
  storeKey?: string;
  /** The ids (a `source`, else a `label`) hidden until the user stores a choice. */
  defaultHiddenInputs?: string[];
  /** The panel's title while this is selected. Defaults to "Form". */
  title?: string;
  className?: string;
}

/**
 * Renders `children` in the stored order, without the hidden ones, and lists
 * them in the inspector panel with a switch, a grip and move buttons. A hidden
 * input is unmounted: it shows no error, the record keeps its loaded value and
 * the resource schema still validates on save.
 *
 * @example
 * import { ConfigurableInputs } from "@chelone/react/inspector";
 *
 * <Edit>
 *   <ConfigurableInputs defaultHiddenInputs={["notes"]}>
 *     <TextInput source="title" />
 *     <TextInput source="notes" />
 *   </ConfigurableInputs>
 * </Edit>
 */
function ConfigurableInputs({
  children,
  resource: resourceProp,
  storeKey,
  defaultHiddenInputs,
  title,
  className,
}: ConfigurableInputsProps) {
  const resource = useResourceContext({ resource: resourceProp });
  const resolvedStoreKey =
    storeKey ??
    (resource ? defaultConfigurableInputsStoreKey(resource) : undefined);
  if (!resolvedStoreKey) {
    throw new Error(
      "<ConfigurableInputs> needs a resource, a storeKey or a resource context.",
    );
  }
  const translate = useTranslate();
  const { hidden, order, publish } = useDataTableColumns({
    storeKey: resolvedStoreKey,
    defaultHiddenColumns: defaultHiddenInputs,
  });

  const elements = Children.toArray(children);
  // A child that is not an element has no id: it stays in place, always shown.
  const inputProps = elements.map((child) =>
    isValidElement<InputProps>(child) ? child.props : undefined,
  );
  const present = inputProps.flatMap((props) => (props ? [props] : []));
  const columns = configurableInputColumns(present).map((column) =>
    // The panel reads this flag, so it must follow the default.
    defaultHiddenInputs?.includes(column.id)
      ? { ...column, defaultHidden: true }
      : column,
  );
  let next = 0;
  const ids = inputProps.map((props) =>
    props ? columns[next++]?.id : undefined,
  );
  const visible = arrangeColumns(ids, { hidden, order }).map(
    (index) => elements[index],
  );

  const columnsJson = JSON.stringify(columns);
  // After mount, never during render, so server rendering writes nothing.
  useEffect(() => {
    publish(JSON.parse(columnsJson));
  }, [publish, columnsJson]);

  return (
    <Configurable
      preferenceKey={resolvedStoreKey}
      title={
        title ?? translate("chelone.inspector.inputs_title", { _: "Form" })
      }
      className={className}
      editor={
        <SortableFieldsSelector
          storeKey={resolvedStoreKey}
          resource={resource}
        />
      }
    >
      {visible}
    </Configurable>
  );
}

export { ConfigurableInputs, type ConfigurableInputsProps };
