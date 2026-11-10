"use server";

/**
 * The `/rsc/posts` row delete. `ServerListDeleteButton` awaits it and then asks
 * Next to re-render the route, so the next server render no longer holds the
 * row: this writes the process-wide provider in `server-data.ts`, which is the
 * one the page read.
 */

import type { Identifier } from "@chelone/core";
import { serverDataProvider } from "./server-data";

export async function deletePost(id: Identifier): Promise<void> {
  await serverDataProvider.delete("posts", { id });
}
