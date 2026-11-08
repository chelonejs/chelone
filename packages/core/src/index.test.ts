import { describe, expect, expectTypeOf, it } from "vitest";
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
  it("exports the rich text rules", () => {
    expect(barrel.isSafeLinkUrl).toBeTypeOf("function");
    expect(barrel.isSafeFileUrl).toBeTypeOf("function");
    expect(barrel.isSafeImageSrc).toBeTypeOf("function");
    expect(barrel.richTextSanitizeOptions).toBeTypeOf("object");
    expect(barrel.richTextStarterKitOptions).toBeTypeOf("object");
    expect(barrel.richTextToolbarItems).toHaveLength(14);
    expect(barrel.richTextBlockTypes).toHaveLength(7);
  });

  it("exports the permission matrix helpers", () => {
    expect(barrel.getPermissionCell).toBeTypeOf("function");
    expect(barrel.togglePermission).toBeTypeOf("function");
    expect(barrel.setPermissionRow).toBeTypeOf("function");
    expect(barrel.isPermissionRowGranted).toBeTypeOf("function");
  });

  it("exports noop", () => {
    expect(barrel.noop).toBeTypeOf("function");
    expect(barrel.noop()).toBeUndefined();
  });

  it("exports the shared UI defaults", () => {
    expect(barrel.SEARCH_THRESHOLD).toBe(5);
    expect(barrel.DEVTOOLS_MAX_VALUE_LENGTH).toBe(2000);
    expect(barrel.TITLE_PORTAL_ID).toBe("chelone-title-portal");
    expect(barrel.UNDO_AUTO_HIDE_MS).toBe(5000);
    expect(barrel.DEFAULT_EXPORT_MAX_RESULTS).toBe(1000);
    expect(barrel.MOBILE_BREAKPOINT).toBe(768);
  });

  it("exports the date format helpers", () => {
    expect(barrel.formatDate).toBeTypeOf("function");
    expect(barrel.formatDateTime).toBeTypeOf("function");
    expect(barrel.formatTime).toBeTypeOf("function");
    expect(barrel.parseDateTimeToISO).toBeTypeOf("function");
    expect(barrel.parseTimeToDate).toBeTypeOf("function");
    expect(barrel.isValidDate).toBeTypeOf("function");
    expect(barrel.isValidDateTime).toBeTypeOf("function");
    expect(barrel.isValidTime).toBeTypeOf("function");
  });

  it("exports humanize, humanizeField and pluralize", () => {
    expect(barrel.humanize).toBeTypeOf("function");
    expect(barrel.humanizeField).toBeTypeOf("function");
    expect(barrel.pluralize).toBeTypeOf("function");
  });

  it("exports getLocaleDirection — the rule the adapters set `dir` from", () => {
    expect(barrel.getLocaleDirection("ar")).toBe("rtl");
    expect(barrel.getLocaleDirection("en")).toBe("ltr");
  });

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

  it("exports the chart data helpers", () => {
    expect(barrel.DEFAULT_CHART_COLORS).toHaveLength(5);
    expect(barrel.chartColor).toBeTypeOf("function");
    expect(barrel.toCartesianRows).toBeTypeOf("function");
    expect(barrel.hasChartValues).toBeTypeOf("function");
    expect(barrel.toDonutSlices).toBeTypeOf("function");
    expect(barrel.getMetricDelta).toBeTypeOf("function");
  });

  it("exports isFilterBranch", () => {
    expect(barrel.isFilterBranch).toBeTypeOf("function");
  });

  it("exports shallowEqual", () => {
    expect(barrel.shallowEqual).toBeTypeOf("function");
  });

  it("exports the ISO duration helpers", () => {
    expect(barrel.parseIsoDuration).toBeTypeOf("function");
    expect(barrel.compactDuration).toBeTypeOf("function");
    expect(barrel.relativeDuration).toBeTypeOf("function");
  });

  it("exports textOf", () => {
    expect(barrel.textOf).toBeTypeOf("function");
  });

  it("exports stripJsonComments", () => {
    expect(barrel.stripJsonComments).toBeTypeOf("function");
  });

  it("exports the CSV parser mapping and header matcher", () => {
    expect(barrel.parseCsvWith).toBeTypeOf("function");
    expect(barrel.matchCsvHeaders).toBeTypeOf("function");
  });

  it("exports the CSV exporter", () => {
    expect(barrel.recordsToCSV).toBeTypeOf("function");
    expect(barrel.downloadCSV).toBeTypeOf("function");
    expect(barrel.defaultExporter).toBeTypeOf("function");
  });

  it("exports the CSV import controller", () => {
    expect(barrel.createCsvImportController).toBeTypeOf("function");
  });

  it("exports the CSV import pipeline", () => {
    expect(barrel.applyCsvMapping).toBeTypeOf("function");
    expect(barrel.csvSchemaFields).toBeTypeOf("function");
    expect(barrel.validateCsvRows).toBeTypeOf("function");
    expect(barrel.runCsvImport).toBeTypeOf("function");
    expect(barrel.csvErrorRows).toBeTypeOf("function");
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

  it("exports the record path reader getAtPath", () => {
    expect(barrel.getAtPath).toBeTypeOf("function");
  });

  it("exports the infinite list controller", () => {
    expect(barrel.createInfiniteListController).toBeTypeOf("function");
  });

  it("exports the reference-many and reference-one controllers", () => {
    expect(barrel.createReferenceManyController).toBeTypeOf("function");
    expect(barrel.createReferenceOneController).toBeTypeOf("function");
  });

  it("exports the list and reference defaults the adapters fall back to", () => {
    expect(barrel.DEFAULT_PER_PAGE).toBe(10);
    expect(barrel.DEFAULT_DEBOUNCE_MS).toBe(500);
    expect(barrel.DEFAULT_REFERENCE_PER_PAGE).toBe(25);
  });

  it("exports the P5 form controllers + composed controllers", () => {
    expect(barrel.createFormController).toBeTypeOf("function");
    expect(barrel.normalizeFormError).toBeTypeOf("function");
    expect(barrel.createEditFormController).toBeTypeOf("function");
    expect(barrel.createCreateFormController).toBeTypeOf("function");
  });

  it("exports firstFieldError", () => {
    expect(barrel.firstFieldError).toBeTypeOf("function");
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
    expect(barrel.choiceListsOf).toBeTypeOf("function");
    expect(barrel.eraseChoicesController).toBeTypeOf("function");
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
    expect(barrel.isLngLatBox).toBeTypeOf("function");
    expect(barrel.bboxToPolygon).toBeTypeOf("function");
    expect(barrel.polygonToBBox).toBeTypeOf("function");
    expect(barrel.aspectLockedBBox).toBeTypeOf("function");
    expect(barrel.toCoordinate).toBeTypeOf("function");
    expect(barrel.latitude).toBeTypeOf("function");
    expect(barrel.longitude).toBeTypeOf("function");
    expect(barrel.LATITUDE_LIMIT).toBe(90);
    expect(barrel.LONGITUDE_LIMIT).toBe(180);
    expect(barrel.wrapLongitude).toBeTypeOf("function");
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
    expect(barrel.DEFAULT_MAP_ZOOM).toBe(13);
    expect(barrel.DEFAULT_MAP_HEIGHT).toBe(300);
    expect(barrel.DEFAULT_PIN_COLOR).toBe("#dc2626");
    expect(barrel.DEFAULT_FIT_PADDING).toBe(20);
    expect(barrel.DEFAULT_MAX_FIT_ZOOM).toBe(18);
    expect(barrel.PIN_NS).toBe("http://www.w3.org/2000/svg");
    // `PIN_NS` is an XML namespace and reads like a URL: core still names no tile server.
    const urls = Object.values(barrel).filter(
      (value) =>
        typeof value === "string" &&
        /^https?:/.test(value) &&
        value !== barrel.PIN_NS,
    );
    expect(urls).toEqual([]);
  });

  it("exports the shape codecs, the editor helpers and the geometry constraints", () => {
    for (const name of [
      "shapeToFeatures",
      "heldFeatures",
      "featuresToShape",
      "toEditorFeatures",
      "fromEditorFeatures",
      "editorStyles",
      "geoAreaM2",
      "areaInTypeOf",
      "hasSelfIntersection",
      "countVertices",
      "minVertices",
      "maxVertices",
      "minAreaM2",
      "noSelfIntersection",
    ] as const) {
      expect(barrel[name]).toBeTypeOf("function");
    }
    const polygon = barrel.bboxToPolygon([0, 0, 1, 1]);
    expect(barrel.countVertices(polygon)).toBe(4);
    expect(barrel.minVertices(5)(polygon, {}, {})).toEqual({
      message: "chelone.validation.minVertices",
      args: { min: 5 },
    });
  });

  it("exports the geocoding and road snapping contracts with no ready-made provider", () => {
    for (const name of [
      "geocodeQueryOptions",
      "reverseGeocodeQueryOptions",
      "createNominatimProvider",
      "createOsrmProvider",
    ] as const) {
      expect(barrel[name]).toBeTypeOf("function");
    }
    expect(() =>
      // @ts-expect-error no endpoint: the provider must reject it at runtime
      barrel.createNominatimProvider({}),
    ).toThrow(TypeError);
    expect(() =>
      // @ts-expect-error no endpoint: the provider must reject it at runtime
      barrel.createOsrmProvider({}),
    ).toThrow(TypeError);
  });

  it("exports the Overpass contract, the tag parser and the presets with no default server", () => {
    for (const name of [
      "createOverpassProvider",
      "overpassQueryOptions",
      "tagToFilter",
      "buildOverpassQuery",
      "findPresetForTags",
      "OverpassError",
      "OverpassRateLimitError",
      "OverpassTimeoutError",
    ] as const) {
      expect(barrel[name]).toBeTypeOf("function");
    }
    expect(() =>
      // @ts-expect-error no endpoint: the provider must reject it at runtime
      barrel.createOverpassProvider({}),
    ).toThrow(TypeError);
    expect(barrel.OSM_PRESETS.roads.bufferLinesMeters).toBe(15);
    expect(new barrel.OverpassRateLimitError()).toBeInstanceOf(
      barrel.OverpassError,
    );
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

  it("exports toLocationState", () => {
    expect(barrel.toLocationState).toBeTypeOf("function");
  });

  it("exports the location state keys", () => {
    expect(barrel.NEXT_PATHNAME_KEY).toBe("nextPathname");
  });

  it("exports the P6 runtime resource registry (W1-T2)", () => {
    expect(barrel.createResourceRegistry).toBeTypeOf("function");
    expect(barrel.computeDefinition).toBeTypeOf("function");
  });

  it("exports the getMany batcher", () => {
    expect(barrel.getManyAggregateOptions).toBeTypeOf("function");
  });

  it("exports the identifier guards", () => {
    expect(barrel.isIdentifier).toBeTypeOf("function");
    expect(barrel.isIdentifierArray).toBeTypeOf("function");
    expect(barrel.identifiersOf).toBeTypeOf("function");
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

  it("exports the record workflow helpers", () => {
    expect(barrel.getApprovalState).toBeTypeOf("function");
    expect(barrel.buildApprovalUpdate).toBeTypeOf("function");
    expect(barrel.buildRejectionUpdate).toBeTypeOf("function");
    expect(barrel.getAllowedTransitions).toBeTypeOf("function");
  });

  it("exports the job monitor helpers", () => {
    expect(barrel.DEFAULT_JOB_TABS).toEqual([
      "running",
      "queued",
      "failed",
      "done",
    ]);
    expect(barrel.getJobActions).toBeTypeOf("function");
    expect(barrel.planJobRetry).toBeTypeOf("function");
    expect(barrel.planJobCancel).toBeTypeOf("function");
  });

  it("exports the presence session and helpers", () => {
    expect(barrel.createPresenceSession).toBeTypeOf("function");
    expect(barrel.presenceTopic).toBeTypeOf("function");
    expect(barrel.toPresenceUser).toBeTypeOf("function");
    expect(barrel.getPresenceInitials).toBeTypeOf("function");
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

  it("exports the assistant session and the echo transport", () => {
    expect(barrel.createAssistantSession).toBeTypeOf("function");
    expect(barrel.echoAssistantTransport).toBeTypeOf("function");
  });

  it("exports the HTTP assistant transport", () => {
    expect(barrel.httpAssistantTransport).toBeTypeOf("function");
    expectTypeOf(barrel.httpAssistantTransport).toEqualTypeOf<
      (
        options: barrel.HttpAssistantTransportOptions,
      ) => barrel.AssistantTransport
    >();
  });

  it("exports the in-memory transport and lock provider", () => {
    expect(barrel.memoryTransport).toBeTypeOf("function");
    expect(barrel.inMemoryLockProvider).toBeTypeOf("function");
    expect(barrel.announceLock).toBeTypeOf("function");
  });

  it("exports the topic hub and the BroadcastChannel transport", () => {
    expect(barrel.createTopicHub).toBeTypeOf("function");
    expect(barrel.broadcastChannelTransport).toBeTypeOf("function");
    expect("resolveReconnectConfig" in barrel).toBe(false);
    expect("reconnectDelay" in barrel).toBe(false);
  });

  it("exports the WebSocket transport", () => {
    expect(barrel.webSocketTransport).toBeTypeOf("function");
  });

  it("exports the server-sent events transport", () => {
    expect(barrel.sseTransport).toBeTypeOf("function");
  });

  it("exports the command menu helpers", () => {
    expect(barrel.matchesHotkey).toBeTypeOf("function");
    expect(barrel.shouldHandleHotkey).toBeTypeOf("function");
    expect(barrel.isTypingTarget).toBeTypeOf("function");
    expect(barrel.rememberRecent).toBeTypeOf("function");
    expect(barrel.recentsKey).toBe("command-menu.recents");
    expect(barrel.createCommandRegistry).toBeTypeOf("function");
    expect(barrel.getVisibleCommands).toBeTypeOf("function");
    expect(barrel.groupCommands).toBeTypeOf("function");
  });

  it("exports the onboarding tour controller and placement", () => {
    expect(barrel.createTourController).toBeTypeOf("function");
    expect(barrel.onboardingTourKey("intro")).toBe(
      "onboarding-tour.intro.completed",
    );
    expect(barrel.placeTourCard).toBeTypeOf("function");
    expect(barrel.tourSpotlightPath).toBeTypeOf("function");
    expect(barrel.REMEASURE_MS).toBe(250);
  });

  it("exports the inspector panel constants", () => {
    expect(barrel.PANEL_WIDTH).toBe(320);
    expect(barrel.INSPECTOR_KEY_STEP).toBe(16);
    expect(barrel.INSPECTOR_OPEN_LABEL).toBe("chelone.inspector.customize");
  });

  it("exports the environment stores", () => {
    expect(barrel.createOfflineStore).toBeTypeOf("function");
    expect(barrel.createApplicationUpdateStore).toBeTypeOf("function");
  });

  it("does NOT leak internal save-pipeline / hydration helpers", () => {
    expect("sanitizeEmptyValues" in barrel).toBe(false);
    expect("toFormErrorMapValue" in barrel).toBe(false);
    expect("composeFormValidator" in barrel).toBe(false);
    expect("resolveHydrationAction" in barrel).toBe(false);
    expect("isPlainObject" in barrel).toBe(false);
    expect("isJsonObject" in barrel).toBe(false);
    expect("ERROR_MAP_PRIORITY" in barrel).toBe(false);
  });

  it("exports isThenable and extractEventValue", () => {
    expect(barrel.isThenable(Promise.resolve(1))).toBe(true);
    expect(barrel.isThenable(() => {})).toBe(false);
    expect(barrel.extractEventValue({ target: { value: "a" } })).toBe("a");
  });

  it("exports isRecord", () => {
    expect(barrel.isRecord).toBeTypeOf("function");
    expect(barrel.isRecord({ a: 1 })).toBe(true);
    expect(barrel.isRecord([1])).toBe(false);
  });

  it("exports isHeadersInit", () => {
    expect(barrel.isHeadersInit).toBeTypeOf("function");
    expect(barrel.isHeadersInit({ a: "b" })).toBe(true);
    expect(barrel.isHeadersInit([["a", "b"]])).toBe(true);
    expect(barrel.isHeadersInit({ a: 1 })).toBe(false);
  });

  it("exports deepEqual", () => {
    expect(barrel.deepEqual).toBeTypeOf("function");
    expect(barrel.deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(barrel.deepEqual([1, 2], [2, 1])).toBe(false);
  });
});
