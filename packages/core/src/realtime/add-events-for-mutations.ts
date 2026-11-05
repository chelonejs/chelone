import type { DataProvider } from "../data/types";
import type { Identifier } from "../resource/identifier";
import { copyMembers } from "./copy-members";
import { recordTopic, resourceTopic } from "./topics";
import type { RealtimeEvent, RealtimeTransport } from "./types";

export interface AddEventsForMutationsOptions {
  /** Called with each publish that rejected; the mutation still resolves. */
  onError?: (error: unknown) => void;
}

type TopicEvent = readonly [topic: string, event: Omit<RealtimeEvent, "topic">];

/**
 * Publishes after each successful write, so other clients can refresh. The
 * result waits for the publishes to settle but never fails because of them;
 * a rejected publish goes to `onError`. Returns the type it was given, so a
 * `RealtimeDataProvider` stays one.
 */
export function addEventsForMutations<TProvider extends DataProvider>(
  base: TProvider,
  publisher: Pick<RealtimeTransport, "publish">,
  { onError }: AddEventsForMutationsOptions = {},
): TProvider {
  const publishAll = async (events: TopicEvent[]) => {
    await Promise.all(
      events.map(async ([topic, event]) => {
        try {
          await publisher.publish(topic, event);
        } catch (error) {
          try {
            onError?.(error);
          } catch {
            // The write is already committed: a throwing handler must not
            // report it as failed.
          }
        }
      }),
    );
  };

  const manyEvents = (
    type: "updated" | "deleted",
    resource: string,
    ids: Identifier[],
  ): TopicEvent[] => [
    [resourceTopic(resource), { type, payload: { ids } }],
    ...ids.map(
      (id): TopicEvent => [
        recordTopic(resource, id),
        { type, payload: { id } },
      ],
    ),
  ];

  const wrapped: TProvider = {
    ...copyMembers(base),
    create: async (resource, params) => {
      const result = await base.create(resource, params);
      await publishAll([
        [
          resourceTopic(resource),
          { type: "created", payload: { ids: [result.data.id] } },
        ],
      ]);
      return result;
    },
    update: async (resource, params) => {
      const result = await base.update(resource, params);
      await publishAll([
        [
          recordTopic(resource, params.id),
          { type: "updated", payload: { id: params.id, data: result.data } },
        ],
        [
          resourceTopic(resource),
          { type: "updated", payload: { ids: [params.id] } },
        ],
      ]);
      return result;
    },
    delete: async (resource, params) => {
      const result = await base.delete(resource, params);
      await publishAll([
        [
          recordTopic(resource, params.id),
          {
            type: "deleted",
            payload: { id: params.id, previousData: result.data },
          },
        ],
        [
          resourceTopic(resource),
          { type: "deleted", payload: { ids: [params.id] } },
        ],
      ]);
      return result;
    },
    updateMany: async (resource, params) => {
      const result = await base.updateMany(resource, params);
      await publishAll(manyEvents("updated", resource, result.data));
      return result;
    },
    deleteMany: async (resource, params) => {
      const result = await base.deleteMany(resource, params);
      await publishAll(manyEvents("deleted", resource, result.data));
      return result;
    },
  };
  return wrapped;
}
