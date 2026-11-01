import { describe, expect, it } from "vitest";
import * as barrel from "./index";

/**
 * Barrel-completeness guard. Every public symbol MUST reach a consumer through
 * `@chelone/core`; a dropped export is invisible to `tsc` (the symbol still
 * type-checks at its definition site) yet breaks app authors at runtime.
 * P2 lost `SortPayload`/`FilterPayload` this way; P4 lost a `UseXResult` alias;
 * P5 shipped `defaultMessages` without a barrel line. This locks the surface.
 *
 * Static property access throughout (no `barrel[name]` loop) so a rename also
 * breaks the test AND biome's noDynamicNamespaceImportAccess stays happy.
 */
describe("@chelone/core barrel", () => {
  it("exports the saved-queries controller and helpers", () => {
    expect(barrel.createSavedQueriesController).toBeTypeOf("function");
    expect(barrel.extractValidSavedQueries).toBeTypeOf("function");
    expect(barrel.isSavedQueryActive).toBeTypeOf("function");
    expect(barrel.savedQueriesKey).toBeTypeOf("function");
  });

  it("exports the lock session, status store and unread counter", () => {
    expect(barrel.createLockSession).toBeTypeOf("function");
    expect(barrel.resolveLockIdentity).toBeTypeOf("function");
    expect(barrel.createRealtimeStatusStore).toBeTypeOf("function");
    expect(barrel.unreadKey).toBeTypeOf("function");
    expect(barrel.subscribeUnreadCount).toBeTypeOf("function");
    expect(barrel.clearUnread).toBeTypeOf("function");
  });

  it("exports the CSV parser mapping and header matcher", () => {
    expect(barrel.parseCsvWith).toBeTypeOf("function");
    expect(barrel.matchCsvHeaders).toBeTypeOf("function");
  });

  it("exports the JSON text helpers", () => {
    expect(barrel.detectJsonShape).toBeTypeOf("function");
    expect(barrel.toJsonText).toBeTypeOf("function");
    expect(barrel.fromJsonText).toBeTypeOf("function");
    expect(barrel.formatJsonValue).toBeTypeOf("function");
  });

  it("exports describeResource", () => {
    expect(barrel.describeResource).toBeTypeOf("function");
  });

  it("exports the infinite list controller", () => {
    expect(barrel.createInfiniteListController).toBeTypeOf("function");
  });

  it("exports the reference-many and reference-one controllers", () => {
    expect(barrel.createReferenceManyController).toBeTypeOf("function");
    expect(barrel.createReferenceOneController).toBeTypeOf("function");
  });

  it("exports the P5 form controllers + composed controllers", () => {
    expect(barrel.createFormController).toBeTypeOf("function");
    expect(barrel.normalizeFormError).toBeTypeOf("function");
    expect(barrel.createEditFormController).toBeTypeOf("function");
    expect(barrel.createCreateFormController).toBeTypeOf("function");
  });

  it("exports the P6 FormGroups primitive (registry + reducer)", () => {
    expect(barrel.createFormGroups).toBeTypeOf("function");
    expect(barrel.reduceGroupState).toBeTypeOf("function");
  });

  it("re-exports the form-core validation-logic factory (P6 W2-T2)", () => {
    // Consumers build a custom `formOptions.validationLogic` (e.g. a filter
    // form validating on change) without a direct @tanstack/form-core dep.
    expect(barrel.revalidateLogic).toBeTypeOf("function");
  });

  it("exports the P5 field-binding + source + array primitives", () => {
    expect(barrel.createFieldBinding).toBeTypeOf("function");
    expect(barrel.defaultFormat).toBeTypeOf("function");
    expect(barrel.defaultParse).toBeTypeOf("function");
    expect(barrel.composeSource).toBeTypeOf("function");
    expect(barrel.createArraySourceScope).toBeTypeOf("function");
    expect(barrel.createRowSourceScope).toBeTypeOf("function");
    expect(barrel.createArrayBinding).toBeTypeOf("function");
    expect(barrel.rootSourceScope).toBeTypeOf("object");
  });

  it("exports the translatable controller and helpers", () => {
    expect(barrel.createTranslatableController).toBeTypeOf("function");
    expect(barrel.getRecordForLocale).toBeTypeOf("function");
    expect(barrel.createLocaleSourceScope).toBeTypeOf("function");
  });

  it("exports the data query option factories", () => {
    expect(barrel.getManyReferenceOptions).toBeTypeOf("function");
  });

  it("exports the P5 validators", () => {
    expect(barrel.composeValidators).toBeTypeOf("function");
    expect(barrel.isRequired).toBeTypeOf("function");
    expect(barrel.isEmpty).toBeTypeOf("function");
    expect(barrel.required).toBeTypeOf("function");
    expect(barrel.minLength).toBeTypeOf("function");
    expect(barrel.maxLength).toBeTypeOf("function");
    expect(barrel.minValue).toBeTypeOf("function");
    expect(barrel.maxValue).toBeTypeOf("function");
    expect(barrel.number).toBeTypeOf("function");
    expect(barrel.regex).toBeTypeOf("function");
    expect(barrel.email).toBeTypeOf("function");
    expect(barrel.choices).toBeTypeOf("function");
  });

  it("exports the infinite list key and options factory", () => {
    expect(barrel.infiniteListKey).toBeTypeOf("function");
    expect(barrel.getInfiniteListOptions).toBeTypeOf("function");
  });

  it("exports the P5 choices controller", () => {
    expect(barrel.createChoicesController).toBeTypeOf("function");
  });

  it("exports defaultMessages — the English catalog apps spread (P5 drop guard)", () => {
    expect(barrel.defaultMessages).toBeTypeOf("object");
    // Sanity: the P5 validation keys apps rely on are present.
    expect(barrel.defaultMessages["chelone.validation.required"]).toBe(
      "Required",
    );
    expect(barrel.defaultMessages["chelone.message.invalid_form"]).toBeTypeOf(
      "string",
    );
  });

  it("exports the geo helpers and a mapMessages catalog that shares no key with defaultMessages", () => {
    expect(barrel.isGeoGeometry).toBeTypeOf("function");
    expect(barrel.isGeoFeature).toBeTypeOf("function");
    expect(barrel.isGeoFeatureCollection).toBeTypeOf("function");
    expect(barrel.isGeoJsonValue).toBeTypeOf("function");
    expect(barrel.isGeoBBox).toBeTypeOf("function");
    expect(barrel.geoBounds).toBeTypeOf("function");
    expect(barrel.bboxToPolygon).toBeTypeOf("function");
    expect(barrel.polygonToBBox).toBeTypeOf("function");
    expect(barrel.aspectLockedBBox).toBeTypeOf("function");
    expect(barrel.toCoordinate).toBeTypeOf("function");
    expect(barrel.latitude).toBeTypeOf("function");
    expect(barrel.longitude).toBeTypeOf("function");
    expect(barrel.mapMessages).toBeTypeOf("object");
    expect(barrel.mapMessages["chelone.map.no_coordinates"]).toBeTypeOf(
      "string",
    );
    expect(barrel.mapMessages["chelone.validation.latitude"]).toBeTypeOf(
      "string",
    );
    const shared = Object.keys(barrel.mapMessages).filter(
      (key) => key in barrel.defaultMessages,
    );
    expect(shared).toEqual([]);
  });

  it("exports the map style and layer helpers and no default tile URL", () => {
    expect(barrel.expandTileUrl).toBeTypeOf("function");
    expect(barrel.rasterTileStyle).toBeTypeOf("function");
    expect(barrel.latLngToLngLat).toBeTypeOf("function");
    expect(barrel.lngLatToLatLng).toBeTypeOf("function");
    expect(barrel.shapeLayerSpecs).toBeTypeOf("function");
    expect(barrel.asFeatureCollection).toBeTypeOf("function");
    expect(barrel.DEFAULT_SHAPE_STYLE.color).toBe("#3388ff");
    const urls = Object.values(barrel).filter(
      (value) => typeof value === "string" && /^https?:/.test(value),
    );
    expect(urls).toEqual([]);
  });

  it("gives mapMessages the placeholders the map components pass", () => {
    const text = (key: keyof typeof barrel.mapMessages) =>
      String(barrel.mapMessages[key]);
    expect(text("chelone.map.simplify.tolerance")).toContain("{value}");
    expect(text("chelone.map.osm.subtracted")).toContain("{area}");
    expect(text("chelone.map.osm.added")).toContain("{area}");
    expect(text("chelone.validation.minVertices")).toContain("{min}");
    expect(text("chelone.validation.maxVertices")).toContain("{max}");
    expect(text("chelone.validation.minArea")).toContain("{min}");
    expect(text("chelone.validation.minArea")).toContain("{area}");
  });

  it("exports the P6 router primitives (path utils + location parser + matcher)", () => {
    expect(barrel.createPath).toBeTypeOf("function");
    expect(barrel.joinBasename).toBeTypeOf("function");
    expect(barrel.removeDoubleSlashes).toBeTypeOf("function");
    expect(barrel.parseLocation).toBeTypeOf("function");
    expect(barrel.matchPath).toBeTypeOf("function");
  });

  it("exports the P6 runtime resource registry (W1-T2)", () => {
    expect(barrel.createResourceRegistry).toBeTypeOf("function");
    expect(barrel.computeDefinition).toBeTypeOf("function");
  });

  it("exports the getMany batcher", () => {
    expect(barrel.getManyAggregateOptions).toBeTypeOf("function");
  });

  it("exports HttpError and the fetchUtils REST helpers", () => {
    expect(barrel.HttpError).toBeTypeOf("function");
    expect(barrel.fetchUtils.fetchJson).toBeTypeOf("function");
    expect(barrel.fetchUtils.queryParameters).toBeTypeOf("function");
  });

  it("exports withLifecycleCallbacks", () => {
    expect(barrel.withLifecycleCallbacks).toBeTypeOf("function");
  });

  it("exports combineDataProviders", () => {
    expect(barrel.combineDataProviders).toBeTypeOf("function");
  });

  it("exports the realtime wrapper, topics and event publisher", () => {
    expect(barrel.realtimeDataProvider).toBeTypeOf("function");
    expect(barrel.isRealtimeDataProvider).toBeTypeOf("function");
    expect(barrel.assertRealtimeDataProvider).toBeTypeOf("function");
    expect(barrel.addEventsForMutations).toBeTypeOf("function");
    expect(barrel.resourceTopic).toBeTypeOf("function");
    expect(barrel.recordTopic).toBeTypeOf("function");
    expect(barrel.lockResourceTopic).toBeTypeOf("function");
    expect(barrel.lockTopic).toBeTypeOf("function");
    expect(barrel.LockConflictError).toBeTypeOf("function");
  });

  it("exports the live query subscribers and lock keys", () => {
    expect(barrel.subscribeLiveResource).toBeTypeOf("function");
    expect(barrel.subscribeLiveRecord).toBeTypeOf("function");
    expect(barrel.subscribeLiveRecords).toBeTypeOf("function");
    expect(barrel.subscribeLiveLock).toBeTypeOf("function");
    expect(barrel.subscribeLiveLocks).toBeTypeOf("function");
    expect(barrel.getLockOptions).toBeTypeOf("function");
    expect(barrel.getLocksOptions).toBeTypeOf("function");
    expect(barrel.lockKey).toBeTypeOf("function");
    expect(barrel.locksKey).toBeTypeOf("function");
  });

  it("exports the in-memory transport and lock provider", () => {
    expect(barrel.memoryTransport).toBeTypeOf("function");
    expect(barrel.inMemoryLockProvider).toBeTypeOf("function");
  });

  it("exports the environment stores", () => {
    expect(barrel.createOfflineStore).toBeTypeOf("function");
    expect(barrel.createApplicationUpdateStore).toBeTypeOf("function");
  });

  it("does NOT leak internal save-pipeline / hydration helpers", () => {
    expect("sanitizeEmptyValues" in barrel).toBe(false);
    expect("toFormErrorMapValue" in barrel).toBe(false);
    expect("isThenable" in barrel).toBe(false);
    expect("composeFormValidator" in barrel).toBe(false);
    expect("resolveHydrationAction" in barrel).toBe(false);
  });
});
