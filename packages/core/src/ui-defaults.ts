/** Defaults both adapters' components share. They have no module of their own. */

/** Past this many columns the columns panel gets a search box. */
export const SEARCH_THRESHOLD = 5;

/** The longest params or result JSON the data provider devtools show for one call. */
export const DEVTOOLS_MAX_VALUE_LENGTH = 2000;

/** The store key the theme mode is persisted under when `storageKey` is not set. */
export const DEFAULT_THEME_STORAGE_KEY = "chelone-theme";

/** The DOM id of the app-bar title portal target. */
export const TITLE_PORTAL_ID = "chelone-title-portal";

/** How long an undoable notification stays before it commits, in milliseconds. */
export const UNDO_AUTO_HIDE_MS = 5000;

/** Max rows an export fetches when `maxResults` is not set. */
export const DEFAULT_EXPORT_MAX_RESULTS = 1000;

/** Viewports narrower than this, in pixels, count as mobile. */
export const MOBILE_BREAKPOINT = 768;
