import { isOverpassAnswer } from "@chelone/core";
import raw from "./overpass-water-roads.json";

if (!isOverpassAnswer(raw)) {
  throw new Error("overpass-water-roads.json is not an Overpass answer");
}

export const waterRoadsAnswer = raw;
