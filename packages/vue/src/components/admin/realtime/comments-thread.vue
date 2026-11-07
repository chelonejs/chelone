<script lang="ts">
import type {
  Identifier,
  LooseRecord,
  ResourceRecord,
} from "@chelone/core";

/** A comment as `<CommentsThread>` reads and writes it. */
export interface CommentRecord {
  id: Identifier;
  authorId?: Identifier;
  authorName?: string;
  body: string;
  /** An ISO timestamp. */
  createdAt?: string;
  /** An ISO timestamp, set once the comment is resolved. */
  resolvedAt?: string | null;
}

/** A row is a comment when it has a string `body`; any other row is skipped. */
function isCommentRecord<TRecord extends ResourceRecord>(
  record: TRecord,
): record is TRecord & CommentRecord {
  return "body" in record && typeof record.body === "string";
}

/** Props for {@link CommentsThread}. */
export interface CommentsThreadProps {
  /** The resource that holds the comments. */
  reference: string;
  /** The field of a comment that holds the id of the record it belongs to. */
  target: string;
  /** Show a Mark resolved button on unresolved comments. Default `false`. */
  resolvable?: boolean;
  /** How many comments to fetch. Default `100`. */
  perPage?: number;
  /** The record to comment on; defaults to the ambient record. */
  record?: LooseRecord;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<CommentsThread>` — the comments of a record, oldest first, with a box to
 * post a new one. On a realtime data provider the thread follows the comments
 * resource, so a comment posted from another client shows up without a reload.
 * With no record, or one without an id, it renders nothing and fetches nothing.
 */

import {
  createMutationOptions,
  isRealtimeDataProvider,
  type RecordResources,
  subscribeLiveResource,
  updateMutationOptions,
} from "@chelone/core";
import { useMutation } from "@tanstack/vue-query";
import { computed, inject, ref, watch, watchEffect } from "vue";
import { useOptionalIdentity } from "../../../auth/auth-hooks";
import { useCheloneContext, useCheloneNotifications } from "../../../context";
import { useGetList } from "../../../data/queries";
import { useTranslate } from "../../../i18n/use-translate";
import { RecordContextKey } from "../../../record/record-context";
import { Badge } from "../../ui/badge";
import Button from "../../ui/button.vue";
import { Card, CardContent } from "../../ui/card";
import Textarea from "../../ui/textarea.vue";

const props = withDefaults(defineProps<CommentsThreadProps>(), {
  resolvable: false,
  perPage: 100,
});

const ctx = useCheloneContext();
const translate = useTranslate();
const notifications = useCheloneNotifications();
const { identity } = useOptionalIdentity();
const ambient = inject(RecordContextKey, null);

const recordId = computed(() => {
  const id = (props.record ?? ambient?.value)?.id;
  return id === undefined || id === null || id === "" ? undefined : id;
});

const { data, isError, isSuccess } = useGetList(
  () => props.reference,
  () => ({
    filter: { [props.target]: recordId.value },
    sort: { field: "createdAt", order: "ASC" },
    pagination: { page: 1, perPage: props.perPage },
  }),
  { enabled: () => recordId.value !== undefined },
);

watchEffect((onCleanup) => {
  if (recordId.value === undefined) return;
  if (!isRealtimeDataProvider(ctx.dataProvider)) return;
  onCleanup(subscribeLiveResource(ctx, props.reference).stop);
});

// Notify once per failed load, so the empty state never stands in for an error.
watch(isError, (failed) => {
  if (failed) {
    notifications?.notify("chelone.notification.http_error", { type: "error" });
  }
});

const items = computed(() => (data.value?.data ?? []).filter(isCommentRecord));
const total = computed(() => data.value?.total ?? items.value.length);

function authorOf(comment: CommentRecord): string {
  return (
    comment.authorName ??
    (comment.authorId === undefined ? undefined : String(comment.authorId)) ??
    translate("chelone.comments.anonymous", { _: "anonymous" })
  );
}

const draft = ref("");
// Built from the options, not `useCreate`/`useUpdate`, which bind the resource
// once at setup while the list and the subscription follow `reference`.
const create = useMutation(
  computed(() => createMutationOptions(ctx, props.reference)),
);
const update = useMutation(
  computed(() =>
    updateMutationOptions<RecordResources<CommentRecord>, string>(
      ctx,
      props.reference,
    ),
  ),
);
const posting = computed(() => create.isPending.value);
const canPost = computed(() => draft.value.trim() !== "" && !posting.value);

async function post() {
  const body = draft.value.trim();
  if (body === "" || posting.value || recordId.value === undefined) return;
  const author = identity.value;
  try {
    await create.mutateAsync({
      data: {
        [props.target]: recordId.value,
        ...(author
          ? { authorId: author.id, authorName: author.fullName }
          : undefined),
        body,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    notifications?.notify("chelone.notification.http_error", { type: "error" });
    return;
  }
  draft.value = "";
  notifications?.notify("chelone.notification.updated", {
    type: "info",
    messageArgs: { smart_count: 1 },
  });
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    void post();
  }
}

async function resolve(comment: CommentRecord) {
  try {
    await update.mutateAsync({
      id: comment.id,
      data: { resolvedAt: new Date().toISOString() },
      previousData: comment,
    });
  } catch {
    notifications?.notify("chelone.notification.http_error", { type: "error" });
    return;
  }
  notifications?.notify("chelone.notification.updated", {
    type: "info",
    messageArgs: { smart_count: 1 },
  });
}

function timeOf(iso: string | null | undefined) {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return { iso: date.toISOString(), label: date.toLocaleString() };
}
</script>

<template>
  <section
    v-if="recordId !== undefined"
    data-slot="comments-thread"
    :class="props.class"
  >
    <p v-if="isError" data-slot="comments-error">
      {{
        translate("chelone.comments.load_failed", {
          _: "Could not load the comments",
        })
      }}
    </p>
    <p v-else-if="isSuccess && items.length === 0" data-slot="comments-empty">
      {{ translate("chelone.comments.empty", { _: "No comments yet. Be the first." }) }}
    </p>
    <Card
      v-for="comment in items"
      :key="comment.id"
      data-slot="comment"
      :data-comment-id="comment.id"
    >
      <CardContent>
        <div>
          <strong>{{ authorOf(comment) }}</strong>
          <time
            v-if="timeOf(comment.createdAt)"
            :datetime="timeOf(comment.createdAt)?.iso"
          >
            {{ timeOf(comment.createdAt)?.label }}
          </time>
        </div>
        <p>{{ comment.body }}</p>
        <Badge v-if="comment.resolvedAt" variant="secondary">
          {{
            translate("chelone.comments.resolved", {
              _: "Resolved {time}",
              time: timeOf(comment.resolvedAt)?.label ?? "",
            })
          }}
        </Badge>
        <Button
          v-else-if="props.resolvable"
          variant="outline"
          size="sm"
          :disabled="update.isPending.value"
          @click="resolve(comment)"
        >
          {{
            translate("chelone.comments.mark_resolved", {
              _: "Mark resolved",
            })
          }}
        </Button>
      </CardContent>
    </Card>
    <p v-if="total > items.length" data-slot="comments-total">
      {{
        translate("chelone.comments.showing", {
          shown: items.length,
          total,
          _: "Showing the first {shown} of {total} comments",
        })
      }}
    </p>
    <div data-slot="comments-form">
      <Textarea
        v-model="draft"
        :placeholder="
          translate('chelone.comments.placeholder', {
            _: 'Write a comment…',
          })
        "
        @keydown="onKeydown"
      />
      <Button :disabled="!canPost" @click="post">
        {{ translate("chelone.comments.post", { _: "Post" }) }}
      </Button>
    </div>
  </section>
</template>
