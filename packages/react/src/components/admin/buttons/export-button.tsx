/**
 * `<ExportButton>` — exports the list data to a file. Ported from shadmin
 * `buttons/export-button.tsx` and rebridged, because chelone's list context has
 * NO `getData` / `exporter` fields (ra-core carries those on the controller;
 * chelone's controller is leaner). Instead this fetches the current page-set
 * itself via the raw `dataProvider.getList(resource, { sort, filter,
 * pagination })` — honoring the ambient filter + primary sort — then runs the
 * `exporter` (a custom `exporter` prop, else the built-in {@link defaultExporter}
 * CSV writer). `fetchRelatedRecords` (ra-core's relation-prefetch helper) does
 * not exist in chelone yet, so the exporter contract drops that argument.
 */

import {
  DEFAULT_EXPORT_MAX_RESULTS,
  defaultExporter,
  definedParams,
  type Exporter,
} from "@chelone/core";
import { Download } from "lucide-react";
import type { Ref } from "react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useDataProvider } from "../../../compat-hooks";
import { useListContext } from "../../../form";
import { useGetResourceLabel, useResourceTranslation } from "../../../label";
import { useNotify } from "../../../notification-hooks";
import { useResourceContext } from "../../../resource";

const defaultIcon = <Download />;

interface ExportButtonProps {
  className?: string;
  exporter?: Exporter;
  icon?: React.ReactNode;
  label?: string;
  maxResults?: number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  resource?: string;
  meta?: unknown;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * A button that exports list data to a file.
 *
 * Respects the current filter + primary sort, with a configurable maximum
 * result count. Pass a custom `exporter` to control the output; the default
 * writes a CSV of every fetched record.
 *
 * @example
 * import { ExportButton } from "@chelone/react";
 *
 * const PostListActions = () => <ExportButton />;
 */
function ExportButton(props: ExportButtonProps) {
  const {
    maxResults = DEFAULT_EXPORT_MAX_RESULTS,
    onClick,
    label: labelProp,
    icon = defaultIcon,
    exporter: customExporter = defaultExporter,
    meta,
    className = "cursor-pointer",
    ref,
  } = props;
  const { total, sort, filter } = useListContext();
  const resource = useResourceContext(props);
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
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!resource) {
        throw new Error(
          "<ExportButton> must be used inside a <Resource> or given a resource prop.",
        );
      }
      dataProvider
        .getList(resource, {
          sort: sort?.[0],
          filter: filter ?? {},
          pagination: { page: 1, perPage: maxResults },
          meta,
        })
        .then(({ data }) => customExporter(data, dataProvider, resource))
        .catch((error) => {
          console.error(error);
          notify("chelone.notification.http_error", { type: "error" });
        });
      if (typeof onClick === "function") {
        onClick(event);
      }
    },
    [
      dataProvider,
      customExporter,
      notify,
      onClick,
      resource,
      sort,
      filter,
      maxResults,
      meta,
    ],
  );

  return (
    <Button
      ref={ref}
      variant="outline"
      onClick={handleClick}
      disabled={total === 0}
      className={className}
      aria-label={typeof label === "string" ? label : undefined}
    >
      {icon}
      {label}
    </Button>
  );
}

export { ExportButton, type ExportButtonProps };
