/**
 * `warning(condition, message)` — dev-only warning helper. Parity with
 * ra-core's `warning`: when `condition` is truthy AND
 * `process.env.NODE_ENV !== "production"`, log `message` via `console.warn`;
 * otherwise it is a no-op (in particular, silent in production builds).
 *
 * `process.env.NODE_ENV` is the bundler-replaced dev/prod flag (Vite, webpack,
 * esbuild, etc. inline it), so this branch is fully tree-shaken from a
 * production build. Chelone ships no `@types/node`, so a minimal ambient
 * declaration below keeps the reference typed without pulling in Node's types.
 */

declare const process: { env?: { NODE_ENV?: string } } | undefined;

export function warning(condition: unknown, message: string): void {
  const nodeEnv =
    typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
  if (condition && nodeEnv !== "production") {
    console.warn(message);
  }
}
