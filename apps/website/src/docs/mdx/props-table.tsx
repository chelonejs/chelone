/**
 * PropsTable — renders a styled props reference table inside MDX.
 *
 * Two modes:
 *   <PropsTable rows={[{ prop, type, default?, description }]} />   inline (ui primitives)
 *   <PropsTable name="ComponentName" />                            auto-load from generated JSON
 *
 * The `name` form shows the props of the framework the page is set to (see
 * `useFramework`): React from `content/props/<name>.json` (typedoc pipeline),
 * Vue from `content/props/vue/<name>.json` (`vue-props.mjs`), which also has
 * the events and slots. The table follows the page's switch and adds none of
 * its own. When no JSON exists yet, or it has no props, a notice renders
 * instead of crashing — so the build is green before/without prop generation.
 */
import { type Framework, useFramework } from "./use-framework";

interface PropRow {
  prop: string;
  type: string;
  default?: string;
  description?: string;
}

interface PropsJson {
  name: string;
  props?: {
    name: string;
    type: string;
    optional?: boolean;
    comment?: string;
  }[];
}

interface VuePropsJson {
  name: string;
  props?: {
    name: string;
    type: string;
    optional?: boolean;
    default?: string;
    comment?: string;
  }[];
  emits?: { name: string; type: string }[];
  slots?: { name: string; type: string; comment?: string }[];
}

interface ResolvedProps {
  rows: PropRow[];
  emits: { name: string; type: string }[];
  slots: { name: string; type: string; comment?: string }[];
}

interface PropsTableProps {
  rows?: PropRow[];
  name?: string;
}

const propJsons = import.meta.glob<{ default: PropsJson }>(
  "../content/props/*.json",
  { eager: true },
);

const vuePropJsons = import.meta.glob<{ default: VuePropsJson }>(
  "../content/props/vue/*.json",
  { eager: true },
);

function resolveForName(
  name: string,
  framework: Framework,
): ResolvedProps | null {
  if (framework === "vue") {
    const page = vuePropJsons[`../content/props/vue/${name}.json`]?.default;
    const props = page?.props ?? [];
    const emits = page?.emits ?? [];
    const slots = page?.slots ?? [];
    if (props.length + emits.length + slots.length === 0) return null;
    return {
      rows: props.map((p) => ({
        prop: p.name,
        type: p.type,
        default: p.default,
        description: p.comment ?? "",
      })),
      emits,
      slots,
    };
  }
  const props = propJsons[`../content/props/${name}.json`]?.default.props ?? [];
  if (props.length === 0) return null;
  return {
    rows: props.map((p) => ({
      prop: p.name,
      type: p.type,
      description: p.comment ?? "",
    })),
    emits: [],
    slots: [],
  };
}

const TABLE_FRAME =
  "not-prose my-6 overflow-x-auto rounded-lg border border-border/60";
const TH = "px-4 py-2 text-left font-semibold text-foreground";
const TD_MONO = "px-4 py-2 font-mono text-xs text-muted-foreground";

function Notice({ name }: { name?: string }) {
  return (
    <div className="not-prose my-6 rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
      Props for <code className="font-mono">{name ?? "this component"}</code>{" "}
      are typed in the component source.
    </div>
  );
}

function EventsTable({ emits }: Pick<ResolvedProps, "emits">) {
  return (
    <div className={TABLE_FRAME}>
      <table aria-label="Events" className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <th className={TH}>Event</th>
            <th className={TH}>Payload</th>
          </tr>
        </thead>
        <tbody>
          {emits.map((event, i) => (
            <tr
              key={event.name}
              className={i % 2 === 0 ? "bg-background" : "bg-muted/40"}
            >
              <td className="px-4 py-2 font-mono text-xs text-foreground">
                {event.name}
              </td>
              <td className={TD_MONO}>{event.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlotsTable({ slots }: Pick<ResolvedProps, "slots">) {
  return (
    <div className={TABLE_FRAME}>
      <table aria-label="Slots" className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            <th className={TH}>Slot</th>
            <th className={TH}>Props</th>
            <th className={TH}>Description</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => (
            <tr
              key={slot.name}
              className={i % 2 === 0 ? "bg-background" : "bg-muted/40"}
            >
              <td className="px-4 py-2 font-mono text-xs text-foreground">
                {slot.name}
              </td>
              <td className={TD_MONO}>{slot.type}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {slot.comment}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PropsTable({ rows, name }: PropsTableProps) {
  const [framework] = useFramework();
  const resolved = rows
    ? { rows, emits: [], slots: [] }
    : name
      ? resolveForName(name, framework)
      : null;

  if (
    !resolved ||
    resolved.rows.length + resolved.emits.length + resolved.slots.length === 0
  ) {
    return <Notice name={name} />;
  }

  return (
    <>
      {resolved.rows.length > 0 && (
        <div className={TABLE_FRAME}>
          <table aria-label="Props" className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className={TH}>Prop</th>
                <th className={TH}>Type</th>
                <th className={TH}>Default</th>
                <th className={TH}>Description</th>
              </tr>
            </thead>
            <tbody>
              {resolved.rows.map((row, i) => (
                <tr
                  key={row.prop}
                  className={i % 2 === 0 ? "bg-background" : "bg-muted/40"}
                >
                  <td className="px-4 py-2 font-mono text-xs text-foreground">
                    {row.prop}
                  </td>
                  <td className={TD_MONO}>{row.type}</td>
                  <td className={TD_MONO}>{row.default ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {resolved.emits.length > 0 && <EventsTable emits={resolved.emits} />}
      {resolved.slots.length > 0 && <SlotsTable slots={resolved.slots} />}
    </>
  );
}
