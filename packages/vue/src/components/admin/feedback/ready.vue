<script setup lang="ts">
/**
 * `<Ready>` — the splash screen shown when an `<Admin>` has no `<Resource>`
 * children configured yet. The Vue twin of `@chelone/react`'s
 * `feedback/ready.tsx`; pure presentational (no core seam), with the Chelone
 * branding/URLs preserved. Icons are inline SVGs (the Vue package ships no icon
 * library — see `feedback/icons.ts`).
 */

import {
  BookOpenTextIcon,
  ChevronsLeftRightIcon,
  GithubMark,
  ScanFaceIcon,
} from "./icons";
</script>

<template>
  <div class="flex flex-col h-screen">
    <div
      class="flex-1 flex flex-col text-white text-center justify-center items-center"
      style="
        background: linear-gradient(
          135deg,
          #00023b 0%,
          #00023b 50%,
          #313264 100%
        );
      "
    >
      <ScanFaceIcon class="size-32 mb-4" />
      <h1 class="text-3xl mb-4">Welcome to Chelone</h1>
      <div class="text-lg opacity-75">
        Your application is properly configured.
        <br />
        Now you can add a &lt;Resource&gt; as child of
        &lt;Admin&gt;&lt;/Admin&gt;
      </div>
    </div>
    <div
      class="flex h-[20vh] bg-muted text-foreground items-center justify-evenly"
    >
      <div class="text-xl">
        <a href="https://chelone.dev/docs">
          <BookOpenTextIcon class="inline mr-4 size-10" />
          Documentation
        </a>
      </div>
      <div class="text-xl">
        <a href="https://chelone.dev/demo">
          <ChevronsLeftRightIcon class="inline mr-4 size-10" />
          Demo
        </a>
      </div>
      <div class="text-xl">
        <a href="https://github.com/chelone-dev/chelone">
          <GithubMark class="inline mr-4 size-10" />
          GitHub
        </a>
      </div>
    </div>
  </div>
</template>
