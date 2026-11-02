import {
  Circle,
  Hexagon,
  MapPin,
  Move,
  Pencil,
  Scissors,
  Spline,
  Square,
  Trash2,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "../../i18n-hooks";
import type { DrawTool } from "./use-terra-draw";

const ICONS: Record<
  DrawTool | "delete",
  ComponentType<{ "aria-hidden"?: boolean }>
> = {
  "draw-point": MapPin,
  "draw-line": Spline,
  "draw-polygon": Hexagon,
  "draw-rectangle": Square,
  "draw-circle": Circle,
  cut: Scissors,
  edit: Pencil,
  move: Move,
  delete: Trash2,
};

const LABELS: Record<DrawTool | "delete", string> = {
  "draw-point": "Draw a point",
  "draw-line": "Draw a line",
  "draw-polygon": "Draw a polygon",
  "draw-rectangle": "Draw a rectangle",
  "draw-circle": "Draw a circle",
  cut: "Cut a hole",
  edit: "Edit",
  move: "Move",
  delete: "Delete",
};

export interface DrawToolbarProps {
  /** The buttons, in order. `delete` is an action on the selected feature, not a tool. */
  tools: readonly (DrawTool | "delete")[];
  /** The pressed tool, or `null`. */
  active: DrawTool | null;
  /** Called with the pressed tool, or `null` when the active one is pressed again. */
  onChange: (tool: DrawTool | null) => void;
  /** Called by the `delete` button. */
  onDelete?: () => void;
  /** Enables the `delete` button. Defaults to false. */
  canDelete?: boolean;
  /** Disables every button. */
  disabled?: boolean;
  className?: string;
}

/**
 * The tool buttons of a drawing input. Each carries `aria-pressed`, and
 * pressing the active tool clears it.
 *
 * @example
 * <DrawToolbar tools={["draw-polygon", "edit", "delete"]} active={tool}
 *   onChange={setTool} onDelete={remove} canDelete={selected !== null} />
 */
export function DrawToolbar({
  tools,
  active,
  onChange,
  onDelete,
  canDelete = false,
  disabled = false,
  className,
}: DrawToolbarProps) {
  const translate = useTranslate();
  return (
    <div
      role="toolbar"
      data-slot="draw-toolbar"
      aria-label={translate("chelone.map.toolbar", { _: "Map tools" })}
      className={cn("flex flex-wrap items-center gap-1", className)}
    >
      {tools.map((id) => {
        const Icon = ICONS[id];
        const label = translate(`chelone.map.tool.${id.replace("-", "_")}`, {
          _: LABELS[id],
        });
        if (id === "delete") {
          return (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={label}
              title={label}
              disabled={disabled || !canDelete}
              onClick={onDelete}
            >
              <Icon aria-hidden />
            </Button>
          );
        }
        const pressed = id === active;
        return (
          <Button
            key={id}
            type="button"
            variant={pressed ? "default" : "outline"}
            size="icon-sm"
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => onChange(pressed ? null : id)}
          >
            <Icon aria-hidden />
          </Button>
        );
      })}
    </div>
  );
}
