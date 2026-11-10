/**
 * `targetOf` — reads an event's target as the element a handler expects.
 *
 * A handler on a DOM element gets `event.target` typed as `EventTarget`, which
 * says nothing about which element fired. `targetOf` narrows it for real: the
 * handler takes the element it asked for, or `undefined` when the target is
 * another element or missing, and returns early on `undefined`.
 */

/** `event.target` when it is an instance of `kind`, else `undefined`. */
export function targetOf<T extends Element>(
  event: Event,
  kind: new () => T,
): T | undefined {
  const target = event.target;
  return target instanceof kind ? target : undefined;
}
