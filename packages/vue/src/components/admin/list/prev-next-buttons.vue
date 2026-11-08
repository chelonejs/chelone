<script lang="ts">
import type { UsePrevNextControllerOptions } from "../../../controllers/use-prev-next-controller";

/** Props for {@link PrevNextButtons}. The controller options, plus `class`. */
export interface PrevNextButtonsProps extends UsePrevNextControllerOptions {
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<PrevNextButtons>` — previous and next buttons that step through the records
 * of the list the ambient record came from, in that list's sort and filter,
 * with the position ("2 / 40") between them. For an Edit or Show page. The Vue
 * twin of `@chelone/react`'s `list/prev-next-buttons.tsx`.
 *
 * Renders a skeleton while the list loads, a labelled error icon when it
 * fails, and an empty placeholder when the record has no neighbour (for
 * instance when the list's filter excludes it).
 *
 * @example
 * <Edit><template #actions><PrevNextButtons /></template>...</Edit>
 */

import { RouterLink } from "vue-router";
import { usePrevNextController } from "../../../controllers/use-prev-next-controller";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import { buttonVariants } from "../../ui/button-variants";
import Skeleton from "../../ui/skeleton.vue";
import { AlertCircleIcon } from "../feedback/icons";
import { ChevronLeftIcon, ChevronRightIcon } from "./list-icons";

// `storeKey` admits `false`, so Vue casts an absent prop to `false` and the
// list's stored params would be ignored; `undefined` keeps "not given".
const props = withDefaults(defineProps<PrevNextButtonsProps>(), {
  storeKey: undefined,
});

const translate = useTranslate();
// A getter, so a changed prop reaches the controller.
const controller = usePrevNextController(() => {
  const { class: _class, ...options } = props;
  return options;
});

const ghostIcon = buttonVariants({ variant: "ghost", size: "icon" });
</script>

<template>
  <Skeleton v-if="controller.isPending" :class="cn('h-9 w-24', props.class)" />
  <span
    v-else-if="controller.error"
    role="img"
    :aria-label="translate('chelone.notification.http_error_label', { _: 'Error' })"
    :class="cn('inline-flex text-destructive', props.class)"
  >
    <AlertCircleIcon />
  </span>
  <div
    v-else-if="!controller.hasPrev && !controller.hasNext"
    data-slot="prev-next-placeholder"
    aria-hidden="true"
    :class="cn('h-9 w-24', props.class)"
  />
  <nav v-else :class="cn('flex items-center gap-1', props.class)">
    <RouterLink
      v-if="controller.prevPath"
      :to="controller.prevPath"
      :aria-label="translate('chelone.navigation.previous', { _: 'Previous' })"
      :class="ghostIcon"
    >
      <ChevronLeftIcon />
    </RouterLink>
    <Button
      v-else
      variant="ghost"
      size="icon"
      :aria-label="translate('chelone.navigation.previous', { _: 'Previous' })"
      disabled
    >
      <ChevronLeftIcon />
    </Button>
    <span
      v-if="typeof controller.index === 'number'"
      class="text-sm text-muted-foreground tabular-nums"
    >
      {{
        controller.total != null
          ? `${controller.index + 1} / ${controller.total}`
          : controller.index + 1
      }}
    </span>
    <RouterLink
      v-if="controller.nextPath"
      :to="controller.nextPath"
      :aria-label="translate('chelone.navigation.next', { _: 'Next' })"
      :class="ghostIcon"
    >
      <ChevronRightIcon />
    </RouterLink>
    <Button
      v-else
      variant="ghost"
      size="icon"
      :aria-label="translate('chelone.navigation.next', { _: 'Next' })"
      disabled
    >
      <ChevronRightIcon />
    </Button>
  </nav>
</template>
