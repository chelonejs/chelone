/**
 * A stand-in for `maplibre-gl`, for `vi.mock`. jsdom has no WebGL, so the real
 * map cannot start. Build tests mock the module with it:
 *
 *   vi.mock("maplibre-gl", () => import("./__fixtures__/fake-maplibre"));
 *
 * It keeps what a test asserts on: the options a map was built with, its
 * sources, layers, controls and handlers, and every marker move. Instances are
 * listed in `maps` and `markers`; `resetFake()` empties both between tests.
 */

import { elementOf } from "@chelone/test-utils";

type Handler = (event?: unknown) => void;
type LngLat = [lng: number, lat: number];

function addHandler(
  handlers: Record<string, Handler[]>,
  type: string,
  handler: Handler,
) {
  const list = handlers[type] ?? [];
  list.push(handler);
  handlers[type] = list;
}

/** A GeoJSON source as `map.getSource(id)` returns it. */
class FakeSource {
  /** What `addSource` was given. */
  readonly spec: { data?: unknown; [key: string]: unknown };
  /** Every `setData` argument, oldest first. */
  readonly dataCalls: unknown[] = [];

  constructor(spec: { data?: unknown; [key: string]: unknown }) {
    this.spec = spec;
  }

  /** The data the source holds now: the last `setData`, else the one it was added with. */
  get data(): unknown {
    return this.dataCalls.length > 0
      ? this.dataCalls[this.dataCalls.length - 1]
      : this.spec.data;
  }

  setData(data: unknown): this {
    this.dataCalls.push(data);
    return this;
  }
}

class FakeMap {
  readonly options: Record<string, unknown>;
  readonly sources: Record<string, FakeSource> = {};
  readonly layers: { id: string; [key: string]: unknown }[] = [];
  readonly controls: unknown[] = [];
  readonly handlers: Record<string, Handler[]> = {};
  /** Every `easeTo` call's options, oldest first. */
  readonly eases: Record<string, unknown>[] = [];
  /** Every `fitBounds` call, oldest first. */
  readonly fits: { bounds: unknown; options: Record<string, unknown> }[] = [];
  loaded = false;
  removed = false;
  private styleFailed = false;

  constructor(options: Record<string, unknown>) {
    this.options = options;
    maps.push(this);
    // The real map loads its style over the network, so `load` is never
    // synchronous. A map removed first never fires it.
    queueMicrotask(() => {
      if (this.removed || this.styleFailed) return;
      this.loaded = true;
      this.emit("load");
    });
  }

  on(type: string, handler: Handler): this {
    addHandler(this.handlers, type, handler);
    return this;
  }

  off(type: string, handler: Handler): this {
    this.handlers[type] = (this.handlers[type] ?? []).filter(
      (h) => h !== handler,
    );
    return this;
  }

  /** Test hook: fire an event as MapLibre would, e.g. `map.emit("click", {...})`. */
  emit(type: string, event?: unknown): void {
    for (const handler of [...(this.handlers[type] ?? [])]) handler(event);
  }

  /**
   * Test hook: the style could not load, as with a 404 or a malformed style.
   * Call it before the microtask: `error` fires and `load` never does.
   */
  failStyle(error: Error = new Error("style failed")): void {
    this.styleFailed = true;
    this.emit("error", { error });
  }

  easeTo(options: Record<string, unknown>): this {
    this.eases.push(options);
    return this;
  }

  fitBounds(bounds: unknown, options: Record<string, unknown> = {}): this {
    this.fits.push({ bounds, options });
    return this;
  }

  isStyleLoaded(): boolean {
    return this.loaded;
  }

  addSource(id: string, source: { data?: unknown }): this {
    this.sources[id] = new FakeSource(source);
    return this;
  }

  getSource(id: string): FakeSource | undefined {
    return this.sources[id];
  }

  removeSource(id: string): this {
    delete this.sources[id];
    return this;
  }

  addLayer(layer: { id: string; [key: string]: unknown }): this {
    this.layers.push(layer);
    return this;
  }

  getLayer(id: string): unknown {
    return this.layers.find((layer) => layer.id === id);
  }

  removeLayer(id: string): this {
    const index = this.layers.findIndex((layer) => layer.id === id);
    if (index >= 0) this.layers.splice(index, 1);
    return this;
  }

  addControl(control: unknown): this {
    this.controls.push(control);
    return this;
  }

  removeControl(control: unknown): this {
    const index = this.controls.indexOf(control);
    if (index >= 0) this.controls.splice(index, 1);
    return this;
  }

  remove(): void {
    this.removed = true;
    for (const key of Object.keys(this.handlers)) delete this.handlers[key];
  }
}

interface FakeMarkerOptions {
  element?: HTMLElement;
  [key: string]: unknown;
}

class FakeMarker {
  readonly options: FakeMarkerOptions;
  /** Every position set, oldest first. */
  readonly lngLats: LngLat[] = [];
  readonly handlers: Record<string, Handler[]> = {};
  map: FakeMap | null = null;
  draggable: boolean;
  removed = false;

  constructor(options: FakeMarkerOptions = {}) {
    this.options = options;
    this.draggable = options.draggable === true;
    markers.push(this);
  }

  setLngLat(lngLat: LngLat): this {
    this.lngLats.push(lngLat);
    return this;
  }

  getLngLat(): { lng: number; lat: number } {
    const last = this.lngLats[this.lngLats.length - 1];
    if (!last) throw new Error("fake Marker: no position was set");
    return { lng: last[0], lat: last[1] };
  }

  setDraggable(draggable: boolean): this {
    this.draggable = draggable;
    return this;
  }

  getElement(): HTMLElement {
    return elementOf(this.options.element, HTMLElement);
  }

  addTo(map: FakeMap): this {
    this.map = map;
    return this;
  }

  on(type: string, handler: Handler): this {
    addHandler(this.handlers, type, handler);
    return this;
  }

  /** Test hook: drag the marker to a new position and fire `dragend`. */
  dragTo(lng: number, lat: number): void {
    this.lngLats.push([lng, lat]);
    for (const handler of this.handlers.dragend ?? []) handler();
  }

  remove(): this {
    this.removed = true;
    this.map = null;
    return this;
  }
}

// `maplibre-gl` names these `Map` and `Marker`; the local names keep the
// global `Map` unshadowed.
export { FakeMap as Map, FakeMarker as Marker };

export const maps: FakeMap[] = [];
export const markers: FakeMarker[] = [];

export function resetFake(): void {
  maps.length = 0;
  markers.length = 0;
}

/** Maps and markers still on the page. */
export const liveMaps = () => maps.filter((map) => !map.removed);
export const liveMarkers = () => markers.filter((marker) => !marker.removed);
