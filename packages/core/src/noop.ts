/** A stable empty function: the same reference on every import, so it is safe in a dependency array or an equality check. */
export const noop = (): void => {};
