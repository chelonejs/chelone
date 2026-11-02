import { defineMessages } from "../i18n/messages";

/**
 * English text for the map add-on. Spread next to `defaultMessages`:
 * `{ ...defaultMessages, ...mapMessages }`. Shares no key with it.
 */
export const mapMessages = defineMessages({
  "chelone.map.no_coordinates": "No coordinates",
  "chelone.map.no_geometry": "No geometry",
  "chelone.map.toolbar": "Map tools",
  "chelone.map.tool.draw_point": "Draw a point",
  "chelone.map.tool.draw_line": "Draw a line",
  "chelone.map.tool.draw_polygon": "Draw a polygon",
  "chelone.map.tool.draw_rectangle": "Draw a rectangle",
  "chelone.map.tool.draw_circle": "Draw a circle",
  "chelone.map.tool.edit": "Edit",
  "chelone.map.tool.move": "Move",
  "chelone.map.tool.delete": "Delete",
  "chelone.map.tool.cut": "Cut a hole",
  "chelone.map.search_placeholder": "Search for a place",
  "chelone.map.search_button": "Search",
  "chelone.map.searching": "Searching...",
  "chelone.map.no_results": "No results",
  "chelone.map.simplify.tolerance": "Tolerance: {value}",
  "chelone.map.simplify.default": "Default",
  "chelone.map.simplify.high": "High",
  "chelone.map.osm.subtract": "Subtract OpenStreetMap areas",
  "chelone.map.osm.add": "Add OpenStreetMap areas",
  "chelone.map.osm.no_sources": "No OpenStreetMap sources configured",
  "chelone.map.osm.no_polygon": "Draw a polygon first",
  "chelone.map.osm.no_match": "No matching OpenStreetMap area found",
  "chelone.map.osm.covered": "The polygon is already covered",
  "chelone.map.osm.subtracted": "Subtracted {area}",
  "chelone.map.osm.added": "Added {area}",
  "chelone.map.osm.would_split":
    "The result has more than one piece, so the polygon was left as it was",
  "chelone.map.osm.union_empty": "The union is empty",
  "chelone.map.osm.error": "OpenStreetMap request failed",
  "chelone.map.osm.rate_limited":
    "OpenStreetMap is rate limiting requests, try again shortly",
  "chelone.validation.latitude": "Must be a latitude between -90 and 90",
  "chelone.validation.longitude": "Must be a longitude between -180 and 180",
  "chelone.validation.minVertices": "Must have at least {min} vertices",
  "chelone.validation.maxVertices": "Must have {max} vertices or fewer",
  "chelone.validation.minArea": "Area {area} is below the minimum of {min}",
  "chelone.validation.selfIntersection": "Must not cross itself",
});
