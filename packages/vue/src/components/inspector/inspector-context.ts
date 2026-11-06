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
  type Ref,
  ref,
  type VNode,
} from "vue";
import { useMicroStore } from "../../store/use-micro-store";

/**
 * What the selection carries. The editor itself is teleported into the panel by
 * its `<Configurable>`, so it keeps the contexts around that and not the
 * panel's; this is only what the selection type needs.
 */
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

const InspectorBodyKey: InjectionKey<Readonly<Ref<HTMLElement | null>>> =
  Symbol("chelone-inspector-body");

/** Called by `<Inspector>` in `setup` with the ref of the panel's body element. */
export function provideInspectorBody(
  body: Readonly<Ref<HTMLElement | null>>,
): void {
  provide(InspectorBodyKey, body);
}

const noBody = ref<HTMLElement | null>(null);

/** The panel's body element while the panel is open, which an editor is teleported into. */
export function useInspectorBody(): Readonly<Ref<HTMLElement | null>> {
  return inject(InspectorBodyKey, noBody);
}
