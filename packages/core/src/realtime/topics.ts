import type { Identifier } from "../resource/identifier";

/** Events for the resource as a whole: creates, and the ids of any write. */
export const resourceTopic = (resource: string): string =>
  `resource/${resource}`;

/** Events for one record. `1` and `"1"` give the same topic. */
export const recordTopic = (resource: string, id: Identifier): string =>
  `resource/${resource}/${id}`;

export const lockResourceTopic = (resource: string): string =>
  `lock/${resource}`;

export const lockTopic = (resource: string, id: Identifier): string =>
  `lock/${resource}/${id}`;

/** Who is on one record. `1` and `"1"` give the same topic. */
export const presenceTopic = (resource: string, id: Identifier): string =>
  `presence/${resource}/${id}`;
