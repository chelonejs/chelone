/**
 * What dnd-kit needs of a browser and jsdom lacks. A drag test stubs
 * `PointerEvent` and `IntersectionObserver` with `vi.stubGlobal`, calls
 * `stubAnimations()` and stubs `getBoundingClientRect` for its own layout.
 */

/** A `PointerEvent` that jsdom can construct: a mouse event with a pointer id. */
export class StubPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? "mouse";
    this.isPrimary = init.isPrimary ?? true;
  }
}

/** What dnd-kit's drop animation needs of an Animation: it finishes at once. */
export class StubAnimation extends EventTarget implements Animation {
  currentTime: CSSNumberish | null = null;
  effect: AnimationEffect | null = null;
  finished: Promise<Animation> = Promise.resolve(this);
  id = "";
  oncancel = null;
  onfinish = null;
  onremove = null;
  overallProgress: number | null = null;
  pending = false;
  playState: AnimationPlayState = "finished";
  playbackRate = 1;
  ready: Promise<Animation> = Promise.resolve(this);
  replaceState: AnimationReplaceState = "active";
  startTime: CSSNumberish | null = null;
  timeline: AnimationTimeline | null = null;
  cancel() {}
  commitStyles() {}
  finish() {}
  pause() {}
  persist() {}
  play() {}
  reverse() {}
  updatePlaybackRate() {}
}

/** An observer that never reports. */
export class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** Gives jsdom the animation calls dnd-kit makes: none are running, and `animate` finishes at once. */
export function stubAnimations(): void {
  document.getAnimations = () => [];
  Element.prototype.getAnimations = () => [];
  Element.prototype.animate = () => new StubAnimation();
}
