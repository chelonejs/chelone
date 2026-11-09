// Core has no node types. Bundlers replace the literal `process.env.NODE_ENV`
// at build time; a browser with no bundler throws on `process`, read as production.
declare const process: { env: { NODE_ENV?: string } };

/** True outside a production build, for warnings an app author should see. */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}
