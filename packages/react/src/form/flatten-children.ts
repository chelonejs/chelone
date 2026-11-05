import { Children, Fragment, isValidElement, type ReactNode } from "react";

/**
 * Flattens `children` into a flat node list, recursing through Fragments, which
 * `Children.toArray` leaves in place. A tab layout uses it so tabs grouped in a
 * Fragment are still found.
 */
export function flattenChildren(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  for (const child of Children.toArray(children)) {
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      out.push(...flattenChildren(child.props.children));
    } else {
      out.push(child);
    }
  }
  return out;
}
