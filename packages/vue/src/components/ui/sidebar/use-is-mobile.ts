import { onMounted, onScopeDispose, type Ref, readonly, ref } from "vue";

/** Viewport width (px) below which the sidebar becomes a drawer (Tailwind `md`). */
const MOBILE_BREAKPOINT = 768;

/**
 * `true` when the viewport is narrower than {@link MOBILE_BREAKPOINT}. The Vue
 * twin of `@chelone/react`'s `useIsMobile`. Starts `false` and corrects on mount,
 * so server and first client render agree; stays `false` without `window` or
 * `window.matchMedia` (SSR, jsdom).
 */
export function useIsMobile(): Readonly<Ref<boolean>> {
  const isMobile = ref(false);

  onMounted(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
    };
    mql.addEventListener("change", onChange);
    onScopeDispose(() => mql.removeEventListener("change", onChange));
    onChange();
  });

  return readonly(isMobile);
}
