import {
  areaInTypeOf,
  type GeoGeometry,
  geoAreaM2,
  geoBounds,
  type OsmPresetName,
  type OsmTagInput,
  type OverpassProvider,
  OverpassRateLimitError,
} from "@chelone/core";
import { useQueryClient } from "@tanstack/react-query";
import { Eraser, Plus } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useInput } from "../../form-hooks";
import { useTranslate } from "../../i18n-hooks";
import { useNotify } from "../../notification-hooks";
import { useMapsConfig } from "../maps/maps-provider";
import { fetchOsmFeatures } from "./osm-features";
import { subtractMask, unionAll } from "./osm-geometry-ops";

type Area = Extract<GeoGeometry, { type: "Polygon" | "MultiPolygon" }>;

export interface OsmFeatureOperatorProps {
  /** The form field holding the Polygon or MultiPolygon. */
  source: string;
  /** `subtract` removes the matching OSM areas from the polygon; `add` merges them in. */
  mode: "subtract" | "add";
  /** Named OSM feature sets to query, such as `water`. */
  presets?: readonly OsmPresetName[];
  /** Extra Overpass tag filters, such as `natural=wood`. */
  tags?: readonly OsmTagInput[];
  /** The button text. A string is translated. Defaults to the mode's message. */
  label?: ReactNode;
  icon?: ReactNode;
  /** Defaults to the `overpass` of `MapsProvider`. One of the two is required. */
  provider?: OverpassProvider;
  disabled?: boolean;
  className?: string;
}

const isArea = (value: unknown): value is Area => {
  const type = (value as { type?: unknown } | null)?.type;
  return type === "Polygon" || type === "MultiPolygon";
};

const isAbort = (error: unknown) =>
  (error as { name?: unknown } | null)?.name === "AbortError";

/** Square kilometres to 3 decimals, from a difference in square metres. */
const km2 = (m2: number) => `${(Math.max(0, m2) / 1e6).toFixed(3)} km²`;

/**
 * A button that edits the polygon in a form field with OpenStreetMap features
 * from the Overpass service: `subtract` removes them, `add` merges them in.
 * The request runs on the click. The result is written like a user edit, so
 * the form turns dirty and the field's validators run.
 *
 * Needs an Overpass provider, from the `provider` prop or `MapsProvider`'s
 * `overpass`; with neither it throws.
 *
 * @example
 * <OsmFeatureOperator source="area" mode="subtract" presets={["water"]} />
 */
export function OsmFeatureOperator({
  source,
  mode,
  presets,
  tags,
  label,
  icon,
  provider: given,
  disabled = false,
  className,
}: OsmFeatureOperatorProps) {
  const { overpass } = useMapsConfig();
  const provider = given ?? overpass;
  if (!provider) {
    throw new Error(
      "OsmFeatureOperator needs an Overpass provider: pass the `provider` prop or set `overpass` on <MapsProvider>.",
    );
  }
  const translate = useTranslate();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { field } = useInput({ source, format: (v: unknown) => v ?? null });
  const current = useRef<unknown>(field.value);
  current.current = field.value;
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const write = (geometry: Area | null) => {
    field.onChange(geometry);
    field.onBlur();
  };

  const run = async () => {
    const value: unknown = field.value;
    if ((presets?.length ?? 0) + (tags?.length ?? 0) === 0) {
      notify("chelone.map.osm.no_sources", { type: "warning" });
      return;
    }
    if (!isArea(value)) {
      notify("chelone.map.osm.no_polygon", { type: "warning" });
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    try {
      const found = await fetchOsmFeatures(
        queryClient,
        geoBounds(value),
        { presets, tags },
        { provider, signal: abort.signal },
      );
      if (abort.signal.aborted) return;
      // The user may have edited the polygon while the request ran; the
      // answer was worked out for the old one and must not replace the new.
      if (current.current !== value) return;
      const matches = found?.features ?? [];
      if (matches.length === 0) {
        notify("chelone.map.osm.no_match", { type: "info" });
        return;
      }
      if (mode === "subtract") {
        const left = subtractMask(value, matches);
        if (left === null) {
          write(null);
          notify("chelone.map.osm.covered", { type: "warning" });
          return;
        }
        const kept = areaInTypeOf(value, left);
        if (!kept) {
          notify("chelone.map.osm.would_split", { type: "warning" });
          return;
        }
        write(kept);
        notify("chelone.map.osm.subtracted", {
          type: "success",
          messageArgs: { area: km2(geoAreaM2(value) - geoAreaM2(kept)) },
        });
        return;
      }
      const merged = unionAll([
        { type: "Feature", properties: {}, geometry: value },
        ...matches,
      ]);
      if (merged === null) {
        notify("chelone.map.osm.union_empty", { type: "warning" });
        return;
      }
      const kept = areaInTypeOf(value, merged);
      if (!kept) {
        notify("chelone.map.osm.would_split", { type: "warning" });
        return;
      }
      write(kept);
      notify("chelone.map.osm.added", {
        type: "success",
        messageArgs: { area: km2(geoAreaM2(kept) - geoAreaM2(value)) },
      });
    } catch (error) {
      if (abort.signal.aborted || isAbort(error)) return;
      notify(
        error instanceof OverpassRateLimitError
          ? "chelone.map.osm.rate_limited"
          : "chelone.map.osm.error",
        { type: "error" },
      );
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        if (!abort.signal.aborted) setRunning(false);
      }
    }
  };

  const text =
    label ??
    translate(
      mode === "subtract" ? "chelone.map.osm.subtract" : "chelone.map.osm.add",
    );
  return (
    <Button
      type="button"
      variant="outline"
      data-slot="osm-feature-operator"
      className={cn(className)}
      disabled={disabled || running}
      onClick={() => void run()}
    >
      {running ? <Spinner /> : icon}
      {typeof text === "string" ? translate(text) : text}
    </Button>
  );
}

const SUBTRACT_ICON = <Eraser />;
const ADD_ICON = <Plus />;

export type OsmFeatureSubtractProps = Omit<OsmFeatureOperatorProps, "mode">;

/**
 * Removes OpenStreetMap areas, such as water, from the polygon in a form field.
 *
 * @example
 * <OsmFeatureSubtract source="area" presets={["water"]} />
 */
export function OsmFeatureSubtract({
  icon = SUBTRACT_ICON,
  ...props
}: OsmFeatureSubtractProps) {
  return <OsmFeatureOperator {...props} mode="subtract" icon={icon} />;
}

export type OsmFeatureAddProps = Omit<OsmFeatureOperatorProps, "mode">;

/**
 * Merges OpenStreetMap areas, such as buildings, into the polygon in a form field.
 *
 * @example
 * <OsmFeatureAdd source="area" presets={["buildings"]} />
 */
export function OsmFeatureAdd({
  icon = ADD_ICON,
  ...props
}: OsmFeatureAddProps) {
  return <OsmFeatureOperator {...props} mode="add" icon={icon} />;
}
