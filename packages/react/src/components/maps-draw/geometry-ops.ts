// The cut and simplify live in `@chelone/utils/geo`, which holds the one copy
// of the turf calls both adapters need.
export type {
  CutResult,
  DrawFeature,
  DrawValue,
  SimplifyOptions,
} from "@chelone/utils/geo";
export { cutFeatures, simplifyGeo } from "@chelone/utils/geo";
