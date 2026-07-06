import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealTag = "div" | "section" | "span" | "li" | "ul";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Render as a different element than the default `div`. */
  as?: RevealTag;
  /** Extra delay (seconds) before this block's children begin animating in. */
  delay?: number;
  /**
   * Animate on mount instead of on scroll-into-view. Use for above-the-fold
   * content (e.g. the hero) so it reveals on load without waiting for the
   * IntersectionObserver.
   */
  immediate?: boolean;
}

/**
 * Scroll-reveal block. Its direct children fade + lift + un-blur (staggered)
 * the first time the block enters the viewport.
 *
 * Robust by design: the hidden state is applied via CSS gated on the `.js`
 * class (set before paint in root.tsx), so the prerendered / no-JS page renders
 * fully visible — only JS hides-then-reveals. The animation is a CSS keyframe
 * (`reveal-up` in index.css), which is reliable across SSR/hydration and
 * respects `prefers-reduced-motion`.
 */
export function Reveal({
  children,
  className,
  as: As = "div",
  delay = 0,
  immediate = false,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (immediate) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return (
    <As
      ref={ref as never}
      data-reveal=""
      data-shown={shown ? "" : undefined}
      className={className}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as never) : undefined}
    >
      {children}
    </As>
  );
}

type RevealItemTag = "div" | "span" | "li" | "h1" | "h2" | "p" | "a";

interface RevealItemProps {
  children: ReactNode;
  className?: string;
  as?: RevealItemTag;
}

/**
 * A direct child of `Reveal` that participates in the staggered entrance. It is
 * a plain element — the parent `Reveal` drives the animation via CSS, so this
 * stays framework-light and renders normally outside a `Reveal`.
 */
export function RevealItem({
  children,
  className,
  as: As = "div",
}: RevealItemProps) {
  return <As className={cn(className)}>{children}</As>;
}
