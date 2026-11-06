/**
 * Stand-ins for `terra-draw` and `terra-draw-maplibre-gl-adapter`, for
 * `vi.mock`. jsdom cannot send the pointer events Terra Draw listens to, so a
 * test drives the fake the way Terra Draw would drive the input:
 *
 *   vi.mock("terra-draw", () => import("./__fixtures__/fake-terra-draw"));
 *   vi.mock("terra-draw-maplibre-gl-adapter", () => import("./__fixtures__/fake-terra-draw"));
 *
 * The `TerraDraw` fake keeps its modes, calls, listeners and a store of
 * features. `put` and `replace` change the store without an event, the way a
 * drag does before it finishes; the `emit*` methods fire the events. Instances
 * are listed in `draws`; `resetFake()` empties the list between tests.
 */

type EventArgs = {
  ready: [];
  finish: [id: FeatureId, context: { mode: string; action: string }];
  change: [ids: (FeatureId | undefined)[], type: string, context?: unknown];
  select: [id: FeatureId];
  deselect: [id: FeatureId];
};
type Listener<E extends keyof EventArgs> = (...args: EventArgs[E]) => void;
type FeatureId = string | number;

export interface FakeFeature {
  type: "Feature";
  id?: FeatureId;
  geometry: { type: string; coordinates?: unknown };
  properties: Record<string, unknown>;
}

interface FakeModeOptions {
  modeName?: string;
  flags?: {
    [mode: string]: {
      feature?: {
        rotateable?: boolean;
        coordinates?: { snappable?: boolean };
      };
    };
  };
  [key: string]: unknown;
}

class FakeMode {
  readonly options: FakeModeOptions;

  constructor(options: FakeModeOptions = {}) {
    this.options = options;
  }

  get modeName(): string | undefined {
    return this.options.modeName;
  }
}

// Named after the real classes, so a test can pick a mode by its class.
export class TerraDrawPointMode extends FakeMode {}
export class TerraDrawLineStringMode extends FakeMode {}
export class TerraDrawPolygonMode extends FakeMode {}
export class TerraDrawRectangleMode extends FakeMode {}
export class TerraDrawCircleMode extends FakeMode {}
export class TerraDrawSelectMode extends FakeMode {}
export class TerraDrawRenderMode extends FakeMode {}

export class TerraDrawMapLibreGLAdapter {
  /** The map the adapter was given. */
  readonly map: unknown;
  readonly options: { map: unknown; [key: string]: unknown };

  constructor(options: { map: unknown; [key: string]: unknown }) {
    this.options = options;
    this.map = options.map;
  }
}

export class TerraDraw {
  readonly options: { adapter: TerraDrawMapLibreGLAdapter; modes: FakeMode[] };
  readonly adapter: TerraDrawMapLibreGLAdapter;
  readonly modes: FakeMode[];
  /** Every `setMode` argument, oldest first. */
  readonly modeCalls: string[] = [];
  /** Every `addFeatures` argument, oldest first. */
  readonly added: FakeFeature[][] = [];
  /** Every `removeFeatures` argument, oldest first. */
  readonly removed: FeatureId[][] = [];
  clears = 0;
  starts = 0;
  stops = 0;
  features: FakeFeature[] = [];
  private readonly listeners: { [E in keyof EventArgs]: Listener<E>[] } = {
    ready: [],
    finish: [],
    change: [],
    select: [],
    deselect: [],
  };
  private nextId = 0;
  private running = false;

  constructor(options: {
    adapter: TerraDrawMapLibreGLAdapter;
    modes: FakeMode[];
  }) {
    this.options = options;
    this.adapter = options.adapter;
    this.modes = options.modes;
    draws.push(this);
  }

  /** The current mode name: the last `setMode`, else none. */
  get mode(): string | undefined {
    return this.modeCalls[this.modeCalls.length - 1];
  }

  /** The mode registered under `name`. */
  modeOf(name: string): FakeMode | undefined {
    return this.modes.find((mode) => mode.modeName === name);
  }

  on<E extends keyof EventArgs>(event: E, listener: Listener<E>): void {
    const listeners: Listener<E>[] = this.listeners[event];
    listeners.push(listener);
  }

  off<E extends keyof EventArgs>(event: E, listener: Listener<E>): void {
    const listeners: Listener<E>[] = this.listeners[event];
    for (let i = listeners.length - 1; i >= 0; i--) {
      if (listeners[i] === listener) listeners.splice(i, 1);
    }
  }

  start(): void {
    this.starts += 1;
    this.running = true;
  }

  stop(): void {
    this.stops += 1;
    this.running = false;
    for (const listeners of Object.values(this.listeners)) listeners.length = 0;
  }

  setMode(mode: string): void {
    this.assertRunning();
    this.modeCalls.push(mode);
  }

  getFeatureId(): FeatureId {
    this.nextId += 1;
    return `draw-${this.nextId}`;
  }

  getSnapshot(): FakeFeature[] {
    return this.features.map((feature) => structuredClone(feature));
  }

  addFeatures(
    features: FakeFeature[],
  ): { id?: FeatureId; valid: boolean; reason?: string }[] {
    this.assertRunning();
    this.added.push(structuredClone(features));
    const answers = features.map((feature) => {
      const reason = refusal?.(feature);
      return reason === undefined
        ? { id: feature.id, valid: true }
        : { id: feature.id, valid: false, reason };
    });
    const accepted = features.filter((_, i) => answers[i]?.valid);
    this.features.push(...structuredClone(accepted));
    this.fire(
      "change",
      accepted.map((f) => f.id),
      "create",
      { origin: "api" },
    );
    return answers;
  }

  removeFeatures(ids: FeatureId[]): void {
    this.assertRunning();
    this.removed.push(ids);
    this.features = this.features.filter(
      (feature) => feature.id === undefined || !ids.includes(feature.id),
    );
    for (const id of ids) this.fire("deselect", id);
    this.fire("change", ids, "delete", { origin: "api" });
  }

  clear(): void {
    this.assertRunning();
    this.clears += 1;
    const ids = this.features.map((feature) => feature.id);
    this.features = [];
    this.fire("change", ids, "delete", { origin: "api" });
  }

  /** Test hook: put a feature in the store the way a drawing does, with no event. */
  put(geometry: FakeFeature["geometry"], mode: string): FeatureId {
    const id = this.getFeatureId();
    this.features.push({
      type: "Feature",
      id,
      geometry,
      properties: { mode },
    });
    return id;
  }

  /** Test hook: change a stored feature's geometry with no event, as a drag does. */
  replace(id: FeatureId, geometry: FakeFeature["geometry"]): void {
    const feature = this.features.find((f) => f.id === id);
    if (!feature) throw new Error(`fake TerraDraw: no feature ${id}`);
    feature.geometry = geometry;
  }

  /** Test hook: set a property on a stored feature with no event. */
  setProperty(id: FeatureId, key: string, value: unknown): void {
    const feature = this.features.find((f) => f.id === id);
    if (!feature) throw new Error(`fake TerraDraw: no feature ${id}`);
    feature.properties[key] = value;
  }

  /** Test hook: remove a feature as the select mode's Delete key does, firing the change. */
  deleteFromStore(id: FeatureId): void {
    this.features = this.features.filter((f) => f.id !== id);
    this.fire("change", [id], "delete");
  }

  emitReady(): void {
    this.fire("ready");
  }

  emitFinish(id: FeatureId, action: string, mode = "polygon"): void {
    this.fire("finish", id, { mode, action });
  }

  emitChange(ids: FeatureId[], type: string, context?: unknown): void {
    this.fire("change", ids, type, context);
  }

  emitSelect(id: FeatureId): void {
    this.fire("select", id);
  }

  emitDeselect(id: FeatureId): void {
    this.fire("deselect", id);
  }

  private fire<E extends keyof EventArgs>(
    event: E,
    ...args: EventArgs[E]
  ): void {
    for (const listener of [...this.listeners[event]]) {
      listener(...args);
    }
  }

  private assertRunning(): void {
    if (!this.running) throw new Error("Terra Draw is not enabled");
  }
}

/** Every `TerraDraw` built since the last reset, oldest first. */
export const draws: TerraDraw[] = [];

let refusal: ((feature: FakeFeature) => string | undefined) | undefined;

/**
 * Makes every `addFeatures` of every instance refuse the features for which
 * `decide` returns a reason, as Terra Draw does for a shape it cannot hold: they
 * are not stored and answer `{ valid: false, reason }`. Cleared by `resetFake()`.
 */
export function refuseFeatures(
  decide: (feature: FakeFeature) => string | undefined,
): void {
  refusal = decide;
}

export function resetFake(): void {
  draws.length = 0;
  refusal = undefined;
}

/** The instances not stopped yet. */
export const liveDraws = () => draws.filter((draw) => draw.stops === 0);
