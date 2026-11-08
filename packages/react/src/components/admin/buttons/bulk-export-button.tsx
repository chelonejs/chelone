/**
 * `<BulkExportButton>` — exports the SELECTED rows to a file. Ported from
 * shadmin `buttons/bulk-export-button.tsx` and rebridged: ra-core's
 * `useBulkExport` hook has no chelone equivalent, so this fetches the selected
 * records itself via `dataProvider.getMany(resource, { ids: selectedIds })`
 * (reading `selectedIds` off `useListContext`) and runs the `exporter` (a custom
 * `exporter` prop, else the built-in {@link defaultExporter} CSV writer). Used
 * inside `<DataTable bulkActionsButtons>` / `<BulkActionsToolbar>`.
 */

import { defaultExporter, definedParams, type Exporter } from "@chelone/core";
import { Download } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { useDataProvider } from "../../../compat-hooks";
import { useListContext } from "../../../form";
import { useGetResourceLabel, useResourceTranslation } from "../../../label";
import { useNotify } from "../../../notification-hooks";
import { useResourceContext } from "../../../resource";

const defaultIcon = <Download className="size-4" />;

interface BulkExportButtonProps {
  className?: string;
  exporter?: Exporter;
  icon?: React.ReactNode;
  label?: string;
  meta?: unknown;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  resource?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Export the selected rows.
 *
 * To be used inside the `<DataTable bulkActionsButtons>` prop.
 *
 * @example
 * import { BulkExportButton, BulkDeleteButton, DataTable, List } from "@chelone/react";
 *
 * export const PostList = () => (
 *   <List>
 *     <DataTable
 *       bulkActionButtons={
 *         <>
 *           <BulkExportButton />
 *           <BulkDeleteButton />
 *         </>
 *       }
 *     >
 *       ...
 *     </DataTable>
 *   </List>
 * );
 */
function BulkExportButton(props: BulkExportButtonProps) {
  const {
    className = "flex items-center gap-2 h-9",
    exporter: customExporter = defaultExporter,
    icon = defaultIcon,
    label: labelProp,
    meta,
    onClick,
    ref,
  } = props;
  const { selectedIds } = useListContext();
  const resource = useResourceContext(props);
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const getResourceLabel = useGetResourceLabel();
  const label = useResourceTranslation({
    resourceI18nKey: resource
      ? `resources.${resource}.action.export`
      : undefined,
    baseI18nKey: "chelone.action.export",
    options: definedParams({
      _: "Export",
      name: resource ? getResourceLabel(resource, 1) : undefined,
    }),
    userText: labelProp,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!resource) {
      throw new Error(
        "<BulkExportButton> must be used inside a <Resource> or given a resource prop.",
      );
    }
    dataProvider
      .getMany(resource, { ids: selectedIds, meta })
      .then(({ data }) => customExporter(data, dataProvider, resource))
      .catch((error) => {
        console.error(error);
        notify("chelone.notification.http_error", { type: "error" });
      });
    onClick?.(event);
  };

  return (
    <Button
      ref={ref}
      onClick={handleClick}
      variant="outline"
      size="sm"
      className={className}
      aria-label={typeof label === "string" ? label : undefined}
    >
      {icon}
      {label}
    </Button>
  );
}

export { BulkExportButton, type BulkExportButtonProps };
