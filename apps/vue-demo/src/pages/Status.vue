<script lang="ts">
export const title = "Status";
export const group = "System";
</script>

<script setup lang="ts">
/**
 * The Status page, the Vue twin of `apps/demo`'s: one button per state an admin
 * falls into while it waits, fails or is out of date, so each loading, empty
 * and error component can be seen working. A URL no route owns lands on
 * `<NotFound>`, the app's catch-all (see `App.vue`): `/nowhere` is one.
 */

import { createFakeDeploy } from "@chelone/demo-data";
import {
  ApplicationUpdatedNotification,
  Button,
  CheckForApplicationUpdate,
  Error as ErrorPage,
  LinearProgress,
  Link,
  Loading,
  LoadingInput,
  Offline,
  Placeholder,
  Ready,
  ShellErrorBoundary,
  useNotify,
} from "@chelone/vue";
import { defineComponent, onBeforeUnmount, ref, watch } from "vue";
import StatusState from "../StatusState.vue";

const loading = ref(false);
const loadingInput = ref(false);
const progress = ref(false);
const placeholder = ref(false);
const error = ref(false);
const offline = ref(false);
const updated = ref(false);
const checking = ref(false);
const released = ref(false);
const ready = ref(false);

const notify = useNotify();

const Crash = defineComponent({
  setup: () => () => {
    throw new Error("The posts could not be loaded.");
  },
});

// `<Offline>` reads the events a real connection loss fires, so a browser that
// is online is shown offline by firing them. After the render, so `<Offline>`
// is mounted and listening when the event goes out.
watch(
  offline,
  (on) => {
    window.dispatchEvent(new Event(on ? "offline" : "online"));
  },
  { flush: "post" },
);

// `<CheckForApplicationUpdate>` compares the deployed page between checks: this
// answers its URL, and "Release a new version" changes the answer.
const deploy = createFakeDeploy();
let uninstall: (() => void) | undefined;
watch(checking, (on) => {
  uninstall?.();
  uninstall = on ? deploy.install() : undefined;
  if (!on) released.value = false;
});

function release() {
  deploy.release();
  released.value = true;
}

onBeforeUnmount(() => {
  if (offline.value) window.dispatchEvent(new Event("online"));
  uninstall?.();
});
</script>

<template>
  <div class="grid items-start gap-4 md:grid-cols-2">
    <StatusState
      name="Loading"
      description="The spinner and message for a page that is slow to load."
      label="Show loading"
      :active="loading"
      @toggle="loading = !loading"
    >
      <Loading
        :delay="0"
        loading-primary="Loading posts"
        loading-secondary="Please wait while your records load."
      />
    </StatusState>
    <StatusState
      name="Loading input"
      description="A disabled input that holds a form field's place while its data loads."
      label="Show a loading input"
      :active="loadingInput"
      @toggle="loadingInput = !loadingInput"
    >
      <LoadingInput label="Author" :timeout="0" />
    </StatusState>
    <StatusState
      name="Linear progress"
      description="An indeterminate bar for a field that is still loading."
      label="Show progress"
      :active="progress"
      @toggle="progress = !progress"
    >
      <LinearProgress :timeout="0" />
    </StatusState>
    <StatusState
      name="Placeholder"
      description="A muted bar that holds a field's height until its value lands."
      label="Show a placeholder"
      :active="placeholder"
      @toggle="placeholder = !placeholder"
    >
      <p class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">Title</span>
        <Placeholder class="h-5 w-40" />
      </p>
    </StatusState>
    <StatusState
      name="Error"
      description="The page a crashed route falls back to. Back returns to the page before."
      label="Crash the page"
      :active="error"
      @toggle="error = !error"
    >
      <ShellErrorBoundary>
        <Crash />
        <template #error="{ error: thrown, reset }">
          <ErrorPage
            :error="thrown"
            :error-info="null"
            :reset-error-boundary="reset"
          />
        </template>
      </ShellErrorBoundary>
    </StatusState>
    <section aria-label="Not found" class="flex flex-col gap-3 rounded-md border p-4">
      <div>
        <h2 class="font-medium">Not found</h2>
        <p class="text-sm text-muted-foreground">
          A URL no route owns shows the not-found page.
        </p>
      </div>
      <div>
        <Link to="/nowhere" class="text-sm">Open a wrong URL</Link>
      </div>
    </section>
    <StatusState
      name="Offline"
      description="What the app shows when the browser loses its connection."
      label="Go offline"
      :active="offline"
      @toggle="offline = !offline"
    >
      <Offline>
        <div
          class="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
        >
          No connection. The list is showing cached posts.
        </div>
      </Offline>
    </StatusState>
    <StatusState
      name="Notification"
      description="A toast from the queue useNotify pushes into, with a close button."
      label="Fire a notification"
      @toggle="notify('Post saved', { type: 'success' })"
    />
    <StatusState
      name="Application updated notification"
      description="The prompt that offers a reload when a new version is live."
      label="Show the update prompt"
      :active="updated"
      @toggle="updated = !updated"
    >
      <ApplicationUpdatedNotification />
    </StatusState>
    <StatusState
      name="Check for application update"
      description="Polls the deployed page and shows the update prompt once its body changes."
      label="Check for a new version"
      :active="checking"
      @toggle="checking = !checking"
    >
      <CheckForApplicationUpdate
        :disabled="false"
        :url="deploy.url"
        :interval="200"
      >
        <template #notification>
          <ApplicationUpdatedNotification class="static translate-x-0 flex-wrap" />
        </template>
      </CheckForApplicationUpdate>
      <div v-if="!released" class="flex flex-col items-start gap-3">
        <p class="text-sm text-muted-foreground">
          The application is up to date.
        </p>
        <Button type="button" size="sm" @click="release">
          Release a new version
        </Button>
      </div>
    </StatusState>
    <StatusState
      name="Ready"
      description="The splash an Admin shows until it has a Resource."
      label="Show the splash"
      :active="ready"
      @toggle="ready = !ready"
    >
      <div class="fixed inset-0 z-50 bg-background">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          class="absolute top-4 right-4 z-10"
          @click="ready = false"
        >
          Close the splash
        </Button>
        <Ready />
      </div>
    </StatusState>
  </div>
</template>
