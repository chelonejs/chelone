import { createContext } from "react";

/**
 * Slug → frontmatter description, supplied by a renderer (e.g. CategoryIndex)
 * so an internal `<Card href>` with no body auto-fills the target's
 * description. Kept out of the MDX-provider chain to avoid a circular glob.
 */
export const CardDescriptions = createContext<Map<string, string>>(new Map());
