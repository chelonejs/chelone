// The "use client" directive, added at emit time (the registry's dist/r content
// and the package build) instead of in source, so a new component needs no
// marking and a server component can import any Chelone module.
//
// A module needs it when it calls a client-only API directly: a hook, a
// context, a class component, or a handler prop. A false positive is harmless;
// a false negative fails on the first server render.

const CALLS_HOOK = /\buse[A-Z]\w*\s*[(<]/;
const CREATES_CONTEXT = /\bcreateContext\s*[(<]/;
const EXTENDS_COMPONENT = /\bextends\s+(?:React\.)?(?:Pure)?Component\b/;
const SETS_HANDLER_PROP = /\bon[A-Z]\w*\s*=(?!=)/;

const HAS_DIRECTIVE =
  /^(?:\s*(?:\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/))*\s*["']use client["']/;

export const needsUseClient = (source) =>
  CALLS_HOOK.test(source) ||
  CREATES_CONTEXT.test(source) ||
  EXTENDS_COMPONENT.test(source) ||
  SETS_HANDLER_PROP.test(source);

export const hasUseClient = (source) => HAS_DIRECTIVE.test(source);

export const withUseClient = (source) =>
  needsUseClient(source) && !hasUseClient(source)
    ? `"use client";\n${source}`
    : source;
