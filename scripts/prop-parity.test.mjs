// A prop one adapter takes and the other does not is a prop parity gap. Some are
// real gaps, such as `sortable` on the Vue fields or `format` on the Vue inputs;
// others are intended, such as Vue's `modelValue` where React has `value`.
// prop-parity-baseline.json lists every gap the adapters have today, so a new
// one-sided prop fails here instead of landing unnoticed, and closing a gap takes
// its row off the list. A row is `<side>.<Component>.<prop>`, one per gap.
//
// Each adapter's props come from the pages `pnpm --dir apps/website props` writes:
// `apps/website/src/docs/content/props/<Name>.json` for React (typedoc) and
// `.../props/vue/<Name>.json` for Vue (vue-component-meta). A component only one
// adapter has is not a prop gap: only names both pages carry are compared.
//
//   pnpm test:scripts                              the check, with the rules pinned
//   node scripts/prop-parity.test.mjs --update    rewrite the baseline from the tree
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const propsDir = path.join(root, "apps/website/src/docs/content/props");
const baselinePath = path.join(root, "prop-parity-baseline.json");

/**
 * Names the two adapters spell the same thing apart, or that one framework has no
 * notion of at all: `class` where React has `className`, `readonly` where it has
 * `readOnly`, and `children`, which Vue has as the default slot.
 */
const SET_ASIDE = new Set(["class", "className", "readonly", "readOnly", "children"]);

/**
 * A React callback prop is a Vue emitted event, and the Vue page lists events
 * under `emits`, apart from its props.
 */
const CALLBACK_PROP = /^on[A-Z]/;

/** @typedef {{ name: string; props: { name: string }[]; slots?: { name: string }[] }} PropsPage */
/** @typedef {{ react?: string[], vue?: string[] }} ComponentGaps the props each adapter has alone */
/** @typedef {`${"react" | "vue"}.${string}.${string}`} GapKey one gap, as `vue.TextField.sortable` */

/** Code-unit order, so the baseline's rows do not move with a locale. */
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The props that mean the same thing in both adapters.
 *
 * @param {PropsPage} page
 * @returns {Set<string>}
 */
function comparableProps(page) {
  return new Set(
    page.props
      .map((prop) => prop.name)
      .filter((name) => !SET_ASIDE.has(name) && !CALLBACK_PROP.test(name)),
  );
}

/**
 * The React props a component's slots stand for. A React prop that hands in
 * markup is a Vue slot under the same name, kebab-case in a template:
 * `#control-suffix` for `controlSuffix`. Where the React name carries a
 * `Renderer` suffix the slot drops it, `#event` for `eventRenderer`, which is
 * how the Vue differences page maps `<CalendarList>` and `<KanbanBoard>`. A
 * renamed pair, `rowExtra` against `#extra`, follows no such pattern and stays
 * a gap.
 *
 * @param {{ name: string }[] | undefined} slots
 * @returns {Set<string>}
 */
function slotStandIns(slots) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const slot of slots ?? []) {
    const name = slot.name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    names.add(name);
    names.add(`${name}Renderer`);
    names.add(`${name}Render`);
  }
  return names;
}

/**
 * The props one adapter's page has and the other's does not, as
 * `{ react: [...], vue: [...] }`, sorted, with a side left out when it has none.
 * An empty object is parity.
 *
 * @param {PropsPage} reactPage
 * @param {PropsPage} vuePage
 * @returns {ComponentGaps}
 */
export function componentGaps(reactPage, vuePage) {
  const react = comparableProps(reactPage);
  const vue = comparableProps(vuePage);
  /** @type {ComponentGaps} */
  const gaps = {};
  const only = (names, other) => [...names].filter((name) => !other.has(name)).sort();
  const reactOnly = only(react, new Set([...vue, ...slotStandIns(vuePage.slots)]));
  const vueOnly = only(vue, react);
  if (reactOnly.length > 0) gaps.react = reactOnly;
  if (vueOnly.length > 0) gaps.vue = vueOnly;
  return gaps;
}

/**
 * The gaps for every component both adapters have a props page for, by component
 * name. A component only one side documents is left out: that is a component one
 * adapter lacks, not a one-sided prop.
 *
 * @param {Map<string, PropsPage>} reactPages
 * @param {Map<string, PropsPage>} vuePages
 * @returns {Map<string, ComponentGaps>}
 */
export function parityGaps(reactPages, vuePages) {
  /** @type {Map<string, ComponentGaps>} */
  const gaps = new Map();
  for (const [name, reactPage] of [...reactPages].sort(([a], [b]) => byName(a, b))) {
    const vuePage = vuePages.get(name);
    if (!vuePage) continue;
    const component = componentGaps(reactPage, vuePage);
    if (Object.keys(component).length > 0) gaps.set(name, component);
  }
  return gaps;
}

/**
 * Each gap as `<side>.<Component>.<prop>`, in component, then side, then prop
 * order: the baseline's rows.
 *
 * @param {Map<string, ComponentGaps>} gaps
 * @returns {GapKey[]}
 */
export function gapKeys(gaps) {
  /** @type {GapKey[]} */
  const keys = [];
  for (const [name, component] of gaps) {
    for (const side of /** @type {("react" | "vue")[]} */ (["react", "vue"])) {
      for (const prop of component[side] ?? []) keys.push(`${side}.${name}.${prop}`);
    }
  }
  return keys;
}

/**
 * @param {GapKey[]} keys
 * @returns {string} the baseline file's text
 */
export function baselineText(keys) {
  return `${JSON.stringify(keys, null, 2)}\n`;
}

/**
 * The rows the baseline is missing, and the rows that are no longer gaps. Both
 * must be empty for the adapters to be where the list says they are.
 *
 * @param {GapKey[]} current
 * @param {GapKey[]} baseline
 * @returns {{ added: GapKey[], removed: GapKey[] }}
 */
export function gapDiffs(current, baseline) {
  const live = new Set(current);
  const known = new Set(baseline);
  return {
    added: current.filter((key) => !known.has(key)),
    removed: baseline.filter((key) => !live.has(key)),
  };
}

/**
 * The props pages written for one adapter, by component name.
 *
 * @param {string} dir
 * @returns {Map<string, PropsPage>}
 */
function propsPages(dir) {
  if (!existsSync(dir)) {
    throw new Error(
      `No props pages in ${path.relative(root, dir)}. Run \`pnpm --dir apps/website props\` and commit the output.`,
    );
  }
  return new Map(
    readdirSync(dir)
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => [
        entry.slice(0, -".json".length),
        /** @type {PropsPage} */ (JSON.parse(readFileSync(path.join(dir, entry), "utf8"))),
      ]),
  );
}

const current = gapKeys(parityGaps(propsPages(propsDir), propsPages(path.join(propsDir, "vue"))));

if (process.argv.includes("--update")) {
  writeFileSync(baselinePath, baselineText(current));
  console.log(`Wrote ${current.length} prop gaps to prop-parity-baseline.json.`);
}

describe("componentGaps", () => {
  /** @param {string[]} names @returns {PropsPage} */
  const page = (names) => ({ name: "Thing", props: names.map((name) => ({ name })) });

  it("sets aside class/className, readonly/readOnly, callback props and events, and children and slots", () => {
    const gaps = componentGaps(
      page([
        "className",
        "readOnly",
        "onChange",
        "onBlur",
        "children",
        "source",
        "label",
        "controlSuffix",
        "primaryText",
        "eventRenderer",
      ]),
      {
        name: "Thing",
        props: [
          { name: "class" },
          { name: "readonly" },
          { name: "onClick" },
          { name: "source" },
          { name: "label" },
        ],
        emits: [{ name: "change" }, { name: "blur" }],
        slots: [{ name: "default" }, { name: "controlSuffix" }, { name: "primary-text" }, { name: "event" }],
      },
    );
    assert.deepEqual(gaps, {});
  });

  it("names a React prop whose Vue slot is renamed", () => {
    const gaps = componentGaps(page(["source", "rowExtra"]), {
      name: "Thing",
      props: [{ name: "source" }],
      slots: [{ name: "extra" }],
    });
    assert.deepEqual(gaps, { react: ["rowExtra"] });
  });

  it("names a prop only one adapter has", () => {
    assert.deepEqual(componentGaps(page(["source", "sortable"]), page(["source"])), {
      react: ["sortable"],
    });
    assert.deepEqual(componentGaps(page(["source"]), page(["source", "format"])), { vue: ["format"] });
  });

  it("names both sides when each has a prop the other does not", () => {
    assert.deepEqual(componentGaps(page(["source", "label"]), page(["source", "choices"])), {
      react: ["label"],
      vue: ["choices"],
    });
  });

  it("lists each side's props in order", () => {
    assert.deepEqual(componentGaps(page(["zIndex", "aLabel", "source"]), page(["source"])), {
      react: ["aLabel", "zIndex"],
    });
  });
});

describe("parityGaps", () => {
  /** @param {string[]} names @returns {PropsPage} */
  const page = (names) => ({ name: "Thing", props: names.map((name) => ({ name })) });

  it("compares only the components both adapters document", () => {
    const gaps = parityGaps(
      new Map([
        ["Both", page(["source", "sortable"])],
        ["ReactOnly", page(["whatever"])],
      ]),
      new Map([
        ["Both", page(["source"])],
        ["VueOnly", page(["whatever"])],
      ]),
    );
    assert.deepEqual([...gaps.keys()], ["Both"]);
    assert.deepEqual(gaps.get("Both"), { react: ["sortable"] });
  });

  it("leaves out a component whose props match", () => {
    const gaps = parityGaps(new Map([["Both", page(["source"])]]), new Map([["Both", page(["source"])]]));
    assert.deepEqual([...gaps], []);
  });

  it("holds the components in name order", () => {
    const gaps = parityGaps(
      new Map([
        ["Zeta", page(["a"])],
        ["Alpha", page(["a"])],
      ]),
      new Map([
        ["Zeta", page([])],
        ["Alpha", page([])],
      ]),
    );
    assert.deepEqual(gapKeys(gaps), ["react.Alpha.a", "react.Zeta.a"]);
  });
});

describe("gapDiffs", () => {
  it("names a one-sided prop the baseline does not hold", () => {
    assert.deepEqual(gapDiffs(["react.TextField.source", "vue.TextField.sortable"], ["react.TextField.source"]), {
      added: ["vue.TextField.sortable"],
      removed: [],
    });
  });

  it("names a baseline row that is no longer a gap", () => {
    assert.deepEqual(gapDiffs(["react.TextField.source"], ["react.TextField.source", "vue.TextField.sortable"]), {
      added: [],
      removed: ["vue.TextField.sortable"],
    });
  });

  it("names a baseline row for a component the adapters no longer compare", () => {
    assert.deepEqual(gapDiffs([], ["vue.TextField.sortable"]), {
      added: [],
      removed: ["vue.TextField.sortable"],
    });
  });

  it("holds a gap the baseline already lists", () => {
    const keys = ["react.TextField.label", "vue.TextField.sortable"];
    assert.deepEqual(gapDiffs(keys, keys), { added: [], removed: [] });
  });
});

describe("the adapters against prop-parity-baseline.json", () => {
  const text = readFileSync(baselinePath, "utf8");
  const baseline = /** @type {GapKey[]} */ (JSON.parse(text));

  it("has no one-sided prop the baseline does not hold", () => {
    const { added } = gapDiffs(current, baseline);
    assert.deepEqual(
      added,
      [],
      `New one-sided props: ${added.join(", ")}. Give the prop to the other adapter too, or add each row to prop-parity-baseline.json and say in the pull request why the difference is intended.`,
    );
  });

  it("holds no gap the adapters no longer have", () => {
    const { removed } = gapDiffs(current, baseline);
    assert.deepEqual(
      removed,
      [],
      `prop-parity-baseline.json is stale; these gaps no longer hold: ${removed.join(", ")}. Run \`node scripts/prop-parity.test.mjs --update\` to rewrite it.`,
    );
  });

  it("writes the baseline the way the script would", () => {
    assert.equal(
      text,
      baselineText(current),
      "prop-parity-baseline.json is not the list the script writes. Run `node scripts/prop-parity.test.mjs --update`.",
    );
  });
});
