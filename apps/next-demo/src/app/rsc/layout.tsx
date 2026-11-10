import type { ReactNode } from "react";
import { RscRouter } from "../../rsc-router";

/**
 * The `/rsc` layout: the router adapter the segment's islands and list links
 * navigate through, around whichever page Next renders. The pages are server
 * components; this layout adds no data of its own.
 */
export default function RscLayout({ children }: { children: ReactNode }) {
  return <RscRouter>{children}</RscRouter>;
}
