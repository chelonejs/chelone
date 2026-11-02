import {
  type Identifier,
  isRealtimeDataProvider,
  subscribeLiveResource,
} from "@chelone/core";
import { type KeyboardEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useOptionalIdentity } from "../../../auth-hooks";
import { useCheloneContext } from "../../../context";
import { useCreate, useGetList, useUpdate } from "../../../hooks";
import { useTranslate } from "../../../i18n-hooks";
import { useNotify } from "../../../notification-hooks";
import { useRecordContext } from "../../../record/record-context";

/** A comment record. Named `CommentRecord` because `Comment` is a DOM type. */
export interface CommentRecord {
  id: Identifier;
  authorId?: Identifier;
  authorName?: string;
  body?: string;
  createdAt?: string;
  resolvedAt?: string | null;
  [key: string]: unknown;
}

export interface CommentsThreadProps {
  /** The resource that holds the comments. */
  reference: string;
  /** The field on a comment that holds the id of its parent record. */
  target: string;
  /** Adds a `Mark resolved` button to unresolved comments. Default false. */
  resolvable?: boolean;
  /** How many comments to fetch. Default 100. */
  perPage?: number;
  /** Defaults to the record context. */
  record?: { id?: Identifier | null };
  className?: string;
}

/** The time of an ISO string, or `undefined` when it does not parse. */
function formatTime(value: unknown): { iso: string; text: string } | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return { iso: date.toISOString(), text: date.toLocaleString() };
}

/**
 * The comments on a record, and a box to add one. Comments are records of the
 * `reference` resource, read and written through the data provider, and the
 * thread refreshes by itself when the provider is realtime.
 *
 * `authorId`, `authorName` and `createdAt` are hints from the client: the
 * server should set them from the session and the clock. There is no edit,
 * delete, reply or paging control, so nobody can change a posted comment here.
 *
 * @example
 * import { CommentsThread } from "@chelone/react";
 *
 * export const PostComments = () => (
 *   <CommentsThread reference="comments" target="postId" resolvable />
 * );
 */
function CommentsThread({
  reference,
  target,
  resolvable = false,
  perPage = 100,
  record: recordProp,
  className,
}: CommentsThreadProps) {
  const translate = useTranslate();
  const notify = useNotify();
  const { dataProvider, queryClient } = useCheloneContext();
  const { identity } = useOptionalIdentity();
  const contextRecord = useRecordContext();
  const record = recordProp ?? contextRecord;
  const id = record?.id;
  const hasRecord = id !== undefined && id !== null;
  const [draft, setDraft] = useState("");

  const { data } = useGetList(
    reference,
    {
      filter: { [target]: id },
      sort: { field: "createdAt", order: "ASC" },
      pagination: { page: 1, perPage },
    },
    { enabled: hasRecord },
  );
  const { mutateAsync: create, isPending: isPosting } = useCreate(reference);
  const { mutate: update } = useUpdate(reference);

  const live = hasRecord && isRealtimeDataProvider(dataProvider);
  useEffect(() => {
    if (!live) return;
    const subscription = subscribeLiveResource(
      { dataProvider, queryClient },
      reference,
    );
    return () => subscription.stop();
  }, [live, dataProvider, queryClient, reference]);

  if (!hasRecord) return null;
  const comments = (data?.data ?? []) as CommentRecord[];
  const total = data?.total;
  const canPost = draft.trim() !== "" && !isPosting;

  const post = async () => {
    if (!canPost) return;
    try {
      await create({
        data: {
          [target]: id,
          authorId: identity?.id ?? "anonymous",
          authorName: identity?.fullName,
          body: draft.trim(),
          createdAt: new Date().toISOString(),
        },
      });
      setDraft("");
    } catch (error) {
      console.error(error);
      notify("chelone.notification.http_error", { type: "error" });
    }
  };

  const resolve = (comment: CommentRecord) =>
    update(
      {
        id: comment.id,
        data: { resolvedAt: new Date().toISOString() },
        previousData: comment,
      },
      {
        onSuccess: () =>
          notify("chelone.notification.updated", {
            type: "info",
            messageArgs: { smart_count: 1 },
          }),
        onError: (error) => {
          console.error(error);
          notify("chelone.notification.http_error", { type: "error" });
        },
      },
    );

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void post();
    }
  };

  return (
    <div data-slot="comments-thread" className={cn("space-y-3", className)}>
      {comments.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          {translate("chelone.comments.empty", {
            _: "No comments yet. Be the first.",
          })}
        </Card>
      ) : (
        comments.map((comment) => {
          const created = formatTime(comment.createdAt);
          const resolved = comment.resolvedAt
            ? formatTime(comment.resolvedAt)
            : undefined;
          return (
            <Card
              key={comment.id}
              data-slot="comment"
              data-comment-id={comment.id}
              className={cn("gap-2 p-4", comment.resolvedAt && "opacity-60")}
            >
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">
                  {comment.authorName || String(comment.authorId ?? "")}
                </span>
                {created ? (
                  <time
                    dateTime={created.iso}
                    className="text-xs text-muted-foreground"
                  >
                    {created.text}
                  </time>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
              {comment.resolvedAt ? (
                <p className="text-xs text-muted-foreground">
                  {translate("chelone.comments.resolved", {
                    _: "Resolved {time}",
                    time: resolved?.text ?? "",
                  }).trim()}
                </p>
              ) : resolvable ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resolve(comment)}
                  >
                    {translate("chelone.comments.mark_resolved", {
                      _: "Mark resolved",
                    })}
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })
      )}
      {total !== undefined && total > comments.length ? (
        <p className="text-xs text-muted-foreground">
          {translate("chelone.comments.showing_first", {
            _: "Showing the first {shown} of {total} comments",
            shown: comments.length,
            total,
          })}
        </p>
      ) : null}
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={translate("chelone.comments.placeholder", {
            _: "Write a comment…",
          })}
        />
        <Button type="button" disabled={!canPost} onClick={() => void post()}>
          {translate("chelone.comments.post", { _: "Post" })}
        </Button>
      </div>
    </div>
  );
}

export { CommentsThread };
