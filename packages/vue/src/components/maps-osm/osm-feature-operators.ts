import { type ComponentObjectPropsOptions, defineComponent, h } from "vue";
import OsmFeatureOperator, {
  type OsmFeatureOperatorProps,
} from "./osm-feature-operator.vue";

export type OsmFeatureSubtractProps = Omit<OsmFeatureOperatorProps, "mode">;
export type OsmFeatureAddProps = Omit<OsmFeatureOperatorProps, "mode">;

/** The operator's prop options but for `mode`, so the wrappers stay in step with it. */
const { mode: _mode, ...options } = OsmFeatureOperator.props;

const svg = (...paths: string[]) =>
  h(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      class: "size-4",
    },
    paths.map((d) => h("path", { d })),
  );

/** An eraser. */
const subtractIcon = () =>
  svg(
    "m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 21",
    "M22 21H7",
    "m5 11 9 9",
  );
/** A plus. */
const addIcon = () => svg("M5 12h14", "M12 5v14");

function operator(
  name: string,
  mode: OsmFeatureOperatorProps["mode"],
  icon: () => ReturnType<typeof svg>,
) {
  return defineComponent(
    (props: Omit<OsmFeatureOperatorProps, "mode">, { slots }) =>
      () =>
        h(OsmFeatureOperator, { ...props, mode }, { icon: slots.icon ?? icon }),
    {
      name,
      props:
        options as unknown as ComponentObjectPropsOptions<OsmFeatureSubtractProps>,
    },
  );
}

/**
 * Removes OpenStreetMap areas, such as water, from the polygon in a form field.
 * The `icon` slot replaces the default icon.
 *
 * @example
 * <OsmFeatureSubtract source="area" :presets="['water']" />
 */
export const OsmFeatureSubtract = operator(
  "OsmFeatureSubtract",
  "subtract",
  subtractIcon,
);

/**
 * Merges OpenStreetMap areas, such as buildings, into the polygon in a form field.
 * The `icon` slot replaces the default icon.
 *
 * @example
 * <OsmFeatureAdd source="area" :presets="['buildings']" />
 */
export const OsmFeatureAdd = operator("OsmFeatureAdd", "add", addIcon);
