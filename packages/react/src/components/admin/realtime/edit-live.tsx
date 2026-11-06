import {
  type AmbientForm,
  type LiveSubscription,
  subscribeLiveRecord,
} from "@chelone/core";
import { useSelector } from "@tanstack/react-store";
import { type RefObject, useEffect, useRef } from "react";
import { useCheloneContext } from "../../../context";
import { useCheloneFormContext } from "../../../form-context";
import { useResourceContext } from "../../../resource";
import { useParams } from "../../../router";
import { Edit, type EditProps } from "../views/edit";

export type EditLiveProps = EditProps;

/**
 * An `<Edit>` that refetches the record when it changes or the connection
 * returns. A change that arrives while the form has unsaved edits is held, and
 * one refetch runs when the form is saved or reset. Needs a realtime data
 * provider.
 *
 * @example
 * import { EditLive, TextInput } from "@chelone/react";
 *
 * export const PostEdit = () => (
 *   <EditLive>
 *     <TextInput source="title" />
 *   </EditLive>
 * );
 */
function EditLive(props: EditLiveProps) {
  const contextResource = useResourceContext();
  const resource = props.resource ?? contextResource;
  const params = useParams();
  const id = props.id ?? params.id;
  const { dataProvider, queryClient } = useCheloneContext();

  const subscriptionRef = useRef<LiveSubscription | null>(null);
  // Set by `<LiveFormSync>`, which mounts once the record has loaded.
  const formRef = useRef<AmbientForm | null>(null);

  // Subscribed here, not under `<Edit>`, so an event between mount and the
  // record arriving is heard. It is held until the record has loaded: the
  // query ignores an invalidation while its first fetch is in flight.
  useEffect(() => {
    // `<Edit>` throws the missing-resource error during this same render.
    if (!resource || id === undefined) return;
    const subscription = subscribeLiveRecord(
      { dataProvider, queryClient },
      resource,
      id,
      {
        paused: () => {
          const state = formRef.current?.store.state;
          return !state || !isClean(state);
        },
      },
    );
    subscriptionRef.current = subscription;
    return () => {
      subscription.stop();
      subscriptionRef.current = null;
    };
  }, [dataProvider, queryClient, resource, id]);

  return (
    <Edit {...props}>
      {props.children}
      <LiveFormSync formRef={formRef} subscriptionRef={subscriptionRef} />
    </Edit>
  );
}

/**
 * Dirty is `!isDefaultValue`, the signal `useWarnWhenUnsavedChanges` uses. A
 * touched form also counts: a refetch keeps a touched form's values, so a
 * change applied while it is touched (even typed back to the record's value)
 * would be dropped and never replayed.
 */
function isClean(state: { isDefaultValue: boolean; isTouched: boolean }) {
  return state.isDefaultValue && !state.isTouched;
}

/** Lets the subscription read the form, and replays held events once it is mounted and clean. @internal */
function LiveFormSync({
  formRef,
  subscriptionRef,
}: {
  formRef: RefObject<AmbientForm | null>;
  subscriptionRef: RefObject<LiveSubscription | null>;
}) {
  const { ambient } = useCheloneFormContext().form;
  const clean = useSelector(ambient.store, isClean);

  useEffect(() => {
    formRef.current = ambient;
    return () => {
      formRef.current = null;
    };
  }, [ambient, formRef]);

  useEffect(() => {
    if (clean) subscriptionRef.current?.resume();
  }, [clean, subscriptionRef]);

  return null;
}

export { EditLive };
