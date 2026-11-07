import { seedData } from "@chelone/demo-data";

const [place] = seedData().places;
if (!place) throw new Error("The demo seed has no places.");

/**
 * The seeded place the maps demos read: a point, a delivery zone, a bounding
 * box, an area and a route, all in Lisbon. The Vue twin of the website's React
 * `previewPlace`.
 */
export const previewPlace = place;
