<script setup lang="ts">
/**
 * `<PostShow>` — the post page, the Vue twin of `apps/demo`'s `PostShow`.
 * `<ShowLive>` fetches the record, refetches it when it changes elsewhere, and
 * publishes it so each `<RecordField>` can label a display field. Around the
 * fields sit the review tools: who else has the post open, the approve button,
 * an in-place title, what changed since the page opened, the revisions and the
 * comments.
 */

import {
  BooleanField,
  CommentsThread,
  DualApprovalButton,
  InPlaceEditor,
  NumberField,
  PresenceBar,
  RecordField,
  ReferenceField,
  ShowLive,
  TextField,
  useParams,
} from "@chelone/vue";
import SimulatedViewer from "../SimulatedViewer.vue";
import PostChanges from "./PostChanges.vue";
import PostTimeline from "./PostTimeline.vue";

const params = useParams();
</script>

<template>
  <!-- Keyed by id: vue-router reuses this page between posts, and the page-open
       diff and the simulated viewer belong to one post. -->
  <ShowLive :key="params.id" resource="posts">
    <div class="flex flex-col gap-6 max-w-xl">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <PresenceBar />
        <DualApprovalButton
          :required="2"
          pending-value="in_review"
          approved-value="published"
        />
      </div>
      <SimulatedViewer v-if="params.id" :post-id="params.id" />
      <RecordField label="Title">
        <InPlaceEditor source="title" notify-on-success />
      </RecordField>
      <RecordField source="status" />
      <RecordField source="body" />
      <RecordField label="Author">
        <ReferenceField source="author_id" reference="authors">
          <TextField source="name" />
        </ReferenceField>
      </RecordField>
      <RecordField label="Views">
        <NumberField source="views" />
      </RecordField>
      <RecordField label="Published">
        <BooleanField source="published" />
      </RecordField>
      <section class="flex flex-col gap-2">
        <h3 class="text-lg font-semibold">Changes since you opened this page</h3>
        <PostChanges />
      </section>
      <section class="flex flex-col gap-2">
        <h3 class="text-lg font-semibold">Revisions</h3>
        <PostTimeline />
      </section>
      <section class="flex flex-col gap-2">
        <h3 class="text-lg font-semibold">Comments</h3>
        <CommentsThread reference="comments" target="post_id" resolvable />
      </section>
    </div>
  </ShowLive>
</template>
