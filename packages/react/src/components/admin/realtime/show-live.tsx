import { type LiveSubscription, subscribeLiveRecord } from "@chelone/core";
import { type RefObject, useEffect, useRef } from "react";
import { useCheloneContext } from "../../../context";
import { useShowContext } from "../../../record-view-context";
import { useResourceContext } from "../../../resource";
import { useParams } from "../../../router";
import { Show, type ShowProps } from "../views/show";

export type ShowLiveProps = ShowProps;

/**
 * A `<Show>` that refetches the record when it changes or the connection
 * returns. Needs a realtime data provider.
 *
 * @example
 * import { RecordField, ShowLive } from "@chelone/react";
 *
 * export const PostShow = () => (
 *   <ShowLive>
 *     <RecordField source="title" />
 *   </ShowLive>
 * );
 */
function ShowLive(props: ShowLiveProps) {
  const contextResource = useResourceContext();
  const resource = props.resource ?? contextResource;
  const params = useParams();
  const id = props.id ?? params.id;
  const { dataProvider, queryClient } = useCheloneContext();

  const subscriptionRef = useRef<LiveSubscription | null>(null);
  // Kept by `<LiveShowSync>`. True until the record has loaded.
  const pendingRef = useRef(true);

  // Subscribed here, not under `<Show>`, so an event between mount and the
  // record arriving is heard. It is held until the record has loaded: the
  // query ignores an invalidation while its first fetch is in flight.
  useEffect(() => {
    // `<Show>` throws the missing-resource error during this same render.
    if (!resource || id === undefined) return;
    const subscription = subscribeLiveRecord(
      { dataProvider, queryClient },
      resource,
      id,
      { paused: () => pendingRef.current },
    );
    subscriptionRef.current = subscription;
    return () => {
      subscription.stop();
      subscriptionRef.current = null;
    };
  }, [dataProvider, queryClient, resource, id]);

  return (
    <Show {...props}>
      {props.children}
      <LiveShowSync pendingRef={pendingRef} subscriptionRef={subscriptionRef} />
    </Show>
  );
}

/** Tells the subscription whether the record is loading, and replays held events once it has loaded. @internal */
function LiveShowSync({
  pendingRef,
  subscriptionRef,
}: {
  pendingRef: RefObject<boolean>;
  subscriptionRef: RefObject<LiveSubscription | null>;
}) {
  const { isPending } = useShowContext();

  useEffect(() => {
    pendingRef.current = isPending;
    if (!isPending) subscriptionRef.current?.resume();
  }, [isPending, pendingRef, subscriptionRef]);

  return null;
}

export { ShowLive };
