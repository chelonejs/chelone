/**
 * The `<Inspector>` context: how `<InspectorButton>` and `<Configurable>` reach
 * the inspector above them. The non-component sibling of `inspector.vue`.
 */

import type { Inspector, InspectorState } from "@chelone/core";
import {
  type ComputedRef,
  computed,
  type InjectionKey,
  inject,
  provide,
  type VNode,
} from "vue";
import { useMicroStore } from "../../store/use-micro-store";

/** What the panel shows for the selected `<Configurable>`: its `#editor` slot. */
export type InspectorEditor = () => VNode[];

/** The inspector the `<Inspector>` created. */
export type InspectorController = Inspector<InspectorEditor>;

/** The inspector's state and the calls that change it. */
export interface InspectorControls
  extends InspectorState<InspectorEditor>,
    Omit<InspectorController, "store"> {}

const InspectorKey: InjectionKey<InspectorController> =
  Symbol("chelone-inspector");

/** Called by `<Inspector>` in `setup`. */
export function provideInspector(inspector: InspectorController): void {
  provide(InspectorKey, inspector);
}

/**
 * The nearest `<Inspector>`'s state and controls as a ref that follows it, or
 * `null` outside one, so an add-on button or wrapper can leave itself out of an
 * app that mounts none. Call it in `setup`.
 */
export function useInspector(): ComputedRef<InspectorControls> | null {
  const inspector = inject(InspectorKey, null);
  if (!inspector) return null;
  const state = useMicroStore(inspector.store);
  return computed(() => ({
    ...state.value,
    enable: inspector.enable,
    disable: inspector.disable,
    toggle: inspector.toggle,
    select: inspector.select,
    release: inspector.release,
  }));
}
