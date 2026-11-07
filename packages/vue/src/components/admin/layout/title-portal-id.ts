/**
 * The DOM id of the app-bar title portal target. `<TitlePortal>` reserves the
 * element with this id; a page `<Title>` teleports into it. Kept in a `.ts`
 * sibling so `title-portal.vue` stays component-only. Matches the React twin's
 * `TITLE_PORTAL_ID` so the two adapters share the same portal contract.
 */
export { TITLE_PORTAL_ID } from "@chelone/core";
