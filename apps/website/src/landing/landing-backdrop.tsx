/**
 * Fixed, behind-everything backdrop for the marketing landing — replaces the
 * flat white/black with an Ethereal-Glass wash: soft brand-violet/indigo orbs
 * and a faint grid that fades out from the top. Theme-adaptive (orbs glow
 * brighter in dark; the grid keys off --border). Pointer-events-none, GPU-safe
 * (blur on a fixed layer, never on scrolling content), and clipped to the
 * viewport so the off-screen orbs never cause horizontal scroll.
 */
export function LandingBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* Faint grid, masked to a soft top-anchored ellipse. */}
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000_15%,transparent_72%)]" />

      {/* Hero glow — violet orb anchored top-center. */}
      <div className="absolute -top-40 left-1/2 h-[38rem] w-[54rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl dark:opacity-30 [background:radial-gradient(circle_at_center,var(--brand-from),transparent_70%)]" />

      {/* Indigo orb, left-mid. */}
      <div className="absolute -left-48 top-1/3 h-[30rem] w-[30rem] rounded-full opacity-[0.14] blur-3xl dark:opacity-25 [background:radial-gradient(circle_at_center,var(--brand-to),transparent_70%)]" />

      {/* Violet orb, lower-right. */}
      <div className="absolute -right-48 top-2/3 h-[32rem] w-[32rem] rounded-full opacity-[0.12] blur-3xl dark:opacity-20 [background:radial-gradient(circle_at_center,var(--brand-from),transparent_70%)]" />
    </div>
  );
}
