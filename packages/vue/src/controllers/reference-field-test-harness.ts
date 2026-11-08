import {
  defineResources,
  fakeDataProvider,
  type LooseRecord,
} from "@chelone/core";
import { QueryClient } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { vi } from "vitest";
import { defineComponent, h, type Ref, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { z } from "zod";
import Admin from "../admin/admin.vue";
import {
  provideRecordContext,
  type RecordValue,
} from "../record/record-context";
import {
  type UseReferenceManyFieldControllerOptions,
  type UseReferenceManyFieldControllerReturn,
  useReferenceManyFieldController,
} from "./use-reference-many-field-controller";
import {
  type UseReferenceOneFieldControllerOptions,
  type UseReferenceOneFieldControllerReturn,
  useReferenceOneFieldController,
} from "./use-reference-one-field-controller";

const commentSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  body: z.string(),
});
const profileSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  bio: z.string(),
});
const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: { schema: commentSchema },
  profiles: { schema: profileSchema },
});
export type Resources = typeof resources;
export type Comment = z.infer<typeof commentSchema>;
export type Profile = z.infer<typeof profileSchema>;

const comments: Comment[] = [
  { id: 1, post_id: 1, body: "a" },
  { id: 2, post_id: 1, body: "b" },
  { id: 3, post_id: 1, body: "c" },
  { id: 4, post_id: 1, body: "d" },
  { id: 5, post_id: 1, body: "e" },
  { id: 6, post_id: 2, body: "f" },
];

const profiles: Profile[] = [
  { id: 1, post_id: 1, bio: "first" },
  { id: 2, post_id: 1, bio: "second" },
  { id: 3, post_id: 2, bio: "other" },
];

/**
 * Mount a composable under a real `<Admin>`, with an ambient record published
 * by an ancestor (`provide` only reaches descendants) whose ref the test can
 * set later.
 */
export function mountProbe<TResult>(
  useProbe: () => TResult,
  initialRecord?: RecordValue,
  failWith?: Error,
) {
  const capture: { result?: TResult } = {};
  const record: Ref<RecordValue> = ref(initialRecord);
  const dataProvider = fakeDataProvider<Resources>({
    posts: structuredClone([
      { id: 1, title: "one" },
      { id: 2, title: "two" },
    ]),
    comments: structuredClone(comments),
    profiles: structuredClone(profiles),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const referenceSpy = vi.spyOn(dataProvider, "getManyReference");
  // Before mount: the first fetch starts during setup.
  if (failWith) referenceSpy.mockRejectedValueOnce(failWith);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: { render: () => null } }],
  });

  const Probe = defineComponent({
    setup() {
      capture.result = useProbe();
      return () => null;
    },
  });
  const RecordProvider = defineComponent({
    setup() {
      provideRecordContext(record);
      return () => h(Probe);
    },
  });
  const Harness = defineComponent({
    setup: () => () =>
      h(
        Admin,
        { dataProvider, queryClient },
        { default: () => h(RecordProvider) },
      ),
  });

  const wrapper = mount(Harness, { global: { plugins: [router] } });
  const countObservers = (keyPart?: string): number =>
    queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => keyPart === undefined || query.queryKey[1] === keyPart)
      .reduce((sum, query) => sum + query.getObserversCount(), 0);
  return {
    wrapper,
    capture,
    record,
    // Every observer, the many controller's inner list observer included.
    observerCount: () => countObservers(),
    // Only the observers that fetch.
    dataObserverCount: () => countObservers("getManyReference"),
    referenceSpy,
  };
}

export const mountMany = (
  options: Omit<
    UseReferenceManyFieldControllerOptions<"comments", LooseRecord, Comment>,
    "reference" | "target"
  > = {},
  record?: RecordValue,
  failWith?: Error,
) =>
  mountProbe<UseReferenceManyFieldControllerReturn<Comment>>(
    () =>
      useReferenceManyFieldController<Resources, "comments">({
        reference: "comments",
        target: "post_id",
        ...options,
      }),
    record,
    failWith,
  );

export const mountOne = (
  options: Omit<
    UseReferenceOneFieldControllerOptions<"profiles", LooseRecord, Profile>,
    "reference" | "target"
  > = {},
  record?: RecordValue,
  failWith?: Error,
) =>
  mountProbe<UseReferenceOneFieldControllerReturn<Profile>>(
    () =>
      useReferenceOneFieldController<Resources, "profiles">({
        reference: "profiles",
        target: "post_id",
        ...options,
      }),
    record,
    failWith,
  );
