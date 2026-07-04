// @ts-nocheck — VERBATIM shadcn color-picker (P7b-T1). Chelone's shared
// tsconfig sets `noUncheckedIndexedAccess: true` (a chelone divergence for its
// OWN authored code); shadcn's tsconfig does not, so this vendored file's
// regex-`match[n]` / hex-`body[n]` accesses — already runtime-guarded by the
// preceding `if (!match) return null` / `body.length === N` checks — trip 50
// index errors here and nowhere else. Per the copy-verbatim rule (scoped ignore
// over churning vendored code), the whole-file directive replaces 50 non-null
// assertions. SAFE: this file is rebridge-inert — it imports only react +
// @/components/ui/{button,popover} + @/lib/utils + its own types, with no
// @chelone/shadmin-core seam a future port would touch, so nothing
// chelone-authored is masked. Revisit if the file gains admin logic.
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  ColorLiteral,
  ColorMode,
  ColorString,
  ColorStringMap,
} from "./color-picker.types";

const COLOR_MODES = [
  "oklch",
  "oklab",
  "hex",
  "rgb",
  "hsl",
  "hwb",
] as const satisfies readonly ColorMode[];

// ---------------------------------------------------------------------------
// Component (top of file — filled in Phase 5)
// ---------------------------------------------------------------------------

interface ColorPickerProps<TMode extends ColorMode | undefined = undefined> {
  value: ColorString | (string & {});
  onChange: (
    value: TMode extends ColorMode ? ColorStringMap[TMode] : ColorString,
  ) => void;
  mode?: TMode;
  native?: boolean;
  className?: string;
  "aria-label"?: string;
}

function ColorPicker<TMode extends ColorMode | undefined>({
  value,
  onChange,
  mode: modeProp,
  native = false,
  className,
  "aria-label": ariaLabel = "Pick a color",
}: ColorPickerProps<TMode>) {
  const parsedFromValue = parseColor(value);

  // Internal canonical oklch is the source of truth for the L×C pad / sliders.
  // We do NOT derive marker position from each re-parse of `value`, because
  // round-tripping through sRGB-bound modes (hex/rgb/hsl/hwb) gamut-clamps the
  // oklch — the marker would refuse to follow the cursor into out-of-sRGB area.
  // Instead: track internal oklch + the user's mode selection, and only resync
  // from `value` when it changes from outside (not from our own emit).
  const [internal, setInternal] = useState(
    () => parsedFromValue?.oklch ?? { l: 0, c: 0, h: 0, a: 1 },
  );
  const [internalMode, setInternalMode] = useState<ColorMode>(
    () => modeProp ?? parsedFromValue?.mode ?? "oklch",
  );
  const lastEmittedRef = useRef<string | null>(null);
  const [hasEyeDropper, setHasEyeDropper] = useState(false);

  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    const parsed = parseColor(value);
    if (parsed) {
      setInternal(parsed.oklch);
      if (modeProp == null) setInternalMode(parsed.mode);
    }
  }, [value, modeProp]);

  useEffect(() => {
    setHasEyeDropper(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);

  if (native) {
    const hex = parsedFromValue
      ? formatHex(parsedFromValue.oklch, false)
      : "#000000";
    return (
      <span
        className={cn(
          "relative inline-block size-5 shrink-0 rounded border cursor-pointer outline-hidden focus-within:ring-2 focus-within:ring-ring",
          className,
        )}
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={hex}
          onChange={(event) => {
            const next = parseHex(event.target.value);
            if (!next) return;
            const oklch = srgbToOklch(next.r, next.g, next.b, next.a);
            const formatted = formatColor(oklch, modeProp ?? "hex");
            lastEmittedRef.current = formatted;
            onChange(formatted as Parameters<typeof onChange>[0]);
          }}
          aria-label={ariaLabel}
          data-slot="color-picker-native"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
    );
  }

  if (!parsedFromValue) {
    return (
      <span
        aria-hidden="true"
        className={cn("inline-block size-5 rounded border", className)}
        style={{ backgroundColor: value }}
        data-slot="color-picker-fallback"
      />
    );
  }

  const activeMode: ColorMode = modeProp ?? internalMode;
  const showModeGroup = modeProp == null;

  const emit = (
    next: { l: number; c: number; h: number; a: number },
    mode: ColorMode = activeMode,
  ) => {
    setInternal(next);
    if (modeProp == null && mode !== internalMode) setInternalMode(mode);
    const formatted = formatColor(next, mode);
    lastEmittedRef.current = formatted;
    onChange(formatted as Parameters<typeof onChange>[0]);
  };

  const handleEyeDropper = async () => {
    if (typeof window === "undefined") return;
    const EyeDropper = (
      window as unknown as {
        EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;
    if (!EyeDropper) return;
    try {
      const result = await new EyeDropper().open();
      const parsed = parseHex(result.sRGBHex);
      if (parsed) {
        emit(srgbToOklch(parsed.r, parsed.g, parsed.b, 1));
      }
    } catch {
      // user cancelled — ignore
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "shrink-0 cursor-pointer rounded outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          data-slot="color-picker-trigger"
        >
          <span
            aria-hidden="true"
            className="block size-5 rounded border"
            style={{ backgroundColor: value }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit min-w-65 p-3"
        align="start"
        data-slot="color-picker"
      >
        <div className="flex flex-col gap-3">
          {showModeGroup && (
            <ModeButtonGroup
              mode={activeMode}
              onChange={(next) => emit(internal, next)}
            />
          )}
          <div className="flex items-center gap-1.5">
            {hasEyeDropper && (
              <button
                type="button"
                onClick={handleEyeDropper}
                aria-label="Pick color from screen"
                data-slot="color-picker-eyedropper"
                className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3"
                  aria-hidden="true"
                >
                  <path d="m11.5 1.5 3 3-2 2-3-3z" />
                  <path d="m9.5 3.5-7 7v3h3l7-7" />
                </svg>
              </button>
            )}
            <PresetPalette onPick={emit} />
          </div>
          <LcPad
            l={internal.l}
            c={internal.c}
            h={internal.h}
            onChange={(l, c) => emit({ ...internal, l, c })}
          />
          <HueStrip h={internal.h} onChange={(h) => emit({ ...internal, h })} />
          <AlphaStrip
            a={internal.a}
            l={internal.l}
            c={internal.c}
            h={internal.h}
            onChange={(a) => emit({ ...internal, a })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Parsing / formatting (filled below)
// ---------------------------------------------------------------------------

function parseAlphaToken(raw: string): number {
  return raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
}

function trimNumber(n: number): number {
  return parseFloat(n.toFixed(4));
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function parseHex(
  value: string,
): { r: number; g: number; b: number; a: number } | null {
  const match = value.match(/^#([0-9a-f]{3,8})$/i);
  if (!match) return null;
  const body = match[1];
  const read = (hex: string) => parseInt(hex, 16) / 255;
  if (body.length === 3) {
    return {
      r: read(body[0].repeat(2)),
      g: read(body[1].repeat(2)),
      b: read(body[2].repeat(2)),
      a: 1,
    };
  }
  if (body.length === 4) {
    return {
      r: read(body[0].repeat(2)),
      g: read(body[1].repeat(2)),
      b: read(body[2].repeat(2)),
      a: read(body[3].repeat(2)),
    };
  }
  if (body.length === 6) {
    return {
      r: read(body.slice(0, 2)),
      g: read(body.slice(2, 4)),
      b: read(body.slice(4, 6)),
      a: 1,
    };
  }
  if (body.length === 8) {
    return {
      r: read(body.slice(0, 2)),
      g: read(body.slice(2, 4)),
      b: read(body.slice(4, 6)),
      a: read(body.slice(6, 8)),
    };
  }
  return null;
}

function parseRgb(
  value: string,
): { r: number; g: number; b: number; a: number } | null {
  const match = value.match(
    /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (!match) return null;
  const channel = (raw: string) =>
    raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw) / 255;
  const r = channel(match[1]);
  const g = channel(match[2]);
  const b = channel(match[3]);
  const a = match[4] != null ? parseAlphaToken(match[4]) : 1;
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b, a };
}

function parseHsl(
  value: string,
): { h: number; s: number; l: number; a: number } | null {
  const match = value.match(
    /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i,
  );
  if (!match) return null;
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  const a = match[4] != null ? parseAlphaToken(match[4]) : 1;
  if ([h, s, l].some((n) => Number.isNaN(n))) return null;
  return { h, s, l, a };
}

const OKLCH_RE =
  /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+(?:deg)?)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i;

function parseOklch(value: string): {
  l: number;
  c: number;
  h: number;
  a: number;
} | null {
  const match = value.match(OKLCH_RE);
  if (!match) return null;
  const l = match[1].endsWith("%")
    ? parseFloat(match[1]) / 100
    : parseFloat(match[1]);
  const c = match[2].endsWith("%")
    ? (parseFloat(match[2]) / 100) * 0.4
    : parseFloat(match[2]);
  const h = parseFloat(match[3].replace(/deg$/i, ""));
  const a = match[4] != null ? parseAlphaToken(match[4]) : 1;
  if ([l, c, h].some((n) => Number.isNaN(n))) return null;
  return { l, c, h, a };
}

// Alpha formatting: oklch and oklab preserve fractional precision via
// trimNumber (perceptual spaces are precision-sensitive); rgb/hsl/hwb round
// to integer percent (byte-quantized inputs make fractional alpha meaningless).
// Hex encodes alpha as a byte-aligned digit pair.

function formatOklch({
  l,
  c,
  h,
  a,
}: {
  l: number;
  c: number;
  h: number;
  a: number;
}): string {
  const base = `oklch(${trimNumber(l)} ${trimNumber(c)} ${trimNumber(h)}`;
  if (a >= 1) return `${base})`;
  return `${base} / ${trimNumber(a * 100)}%)`;
}

function formatHex(
  oklch: { l: number; c: number; h: number; a: number },
  includeAlpha: boolean,
): string {
  const [r, g, b] = oklchToSrgb(oklch.l, oklch.c, oklch.h);
  const channel = (n: number) =>
    Math.round(clamp01(n) * 255)
      .toString(16)
      .padStart(2, "0");
  const base = `#${channel(r)}${channel(g)}${channel(b)}`;
  if (!includeAlpha) return base;
  return `${base}${channel(oklch.a)}`;
}

function formatRgb(oklch: {
  l: number;
  c: number;
  h: number;
  a: number;
}): string {
  const [r, g, b] = oklchToSrgb(oklch.l, oklch.c, oklch.h);
  const channel = (n: number) => Math.round(clamp01(n) * 255);
  const base = `rgb(${channel(r)} ${channel(g)} ${channel(b)}`;
  if (oklch.a >= 1) return `${base})`;
  return `${base} / ${Math.round(oklch.a * 100)}%)`;
}

function formatHsl(oklch: {
  l: number;
  c: number;
  h: number;
  a: number;
}): string {
  const [r, g, b] = oklchToSrgb(oklch.l, oklch.c, oklch.h);
  const hsl = srgbToHsl(clamp01(r), clamp01(g), clamp01(b));
  const h = Math.round(hsl.h);
  const s = Math.round(hsl.s * 100);
  const l = Math.round(hsl.l * 100);
  const base = `hsl(${h} ${s}% ${l}%`;
  if (oklch.a >= 1) return `${base})`;
  return `${base} / ${Math.round(oklch.a * 100)}%)`;
}

const OKLAB_RE =
  /^oklab\(\s*([\d.]+%?)\s+(-?[\d.]+%?)\s+(-?[\d.]+%?)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i;

function parseOklab(value: string): {
  l: number;
  a: number;
  b: number;
  alpha: number;
} | null {
  const match = value.match(OKLAB_RE);
  if (!match) return null;
  const l = match[1].endsWith("%")
    ? parseFloat(match[1]) / 100
    : parseFloat(match[1]);
  // Per CSS Color 4, oklab a/b percentages are relative to 0.4 (signed).
  const a = match[2].endsWith("%")
    ? (parseFloat(match[2]) / 100) * 0.4
    : parseFloat(match[2]);
  const b = match[3].endsWith("%")
    ? (parseFloat(match[3]) / 100) * 0.4
    : parseFloat(match[3]);
  const alpha = match[4] != null ? parseAlphaToken(match[4]) : 1;
  if ([l, a, b].some((n) => Number.isNaN(n))) return null;
  return { l, a, b, alpha };
}

function formatOklab(oklch: {
  l: number;
  c: number;
  h: number;
  a: number;
}): string {
  const { a, b } = oklchToOklab(oklch.l, oklch.c, oklch.h);
  const base = `oklab(${trimNumber(oklch.l)} ${trimNumber(a)} ${trimNumber(b)}`;
  if (oklch.a >= 1) return `${base})`;
  return `${base} / ${trimNumber(oklch.a * 100)}%)`;
}

const HWB_RE =
  /^hwb\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i;

function parseHwb(value: string): {
  h: number;
  w: number;
  b: number;
  a: number;
} | null {
  const match = value.match(HWB_RE);
  if (!match) return null;
  const h = parseFloat(match[1]);
  const w = parseFloat(match[2]) / 100;
  const b = parseFloat(match[3]) / 100;
  const a = match[4] != null ? parseAlphaToken(match[4]) : 1;
  if ([h, w, b].some((n) => Number.isNaN(n))) return null;
  return { h, w, b, a };
}

function formatHwb(oklch: {
  l: number;
  c: number;
  h: number;
  a: number;
}): string {
  const [r, g, b] = oklchToSrgb(oklch.l, oklch.c, oklch.h);
  const hwb = srgbToHwb(clamp01(r), clamp01(g), clamp01(b));
  const h = Math.round(hwb.h);
  const w = Math.round(hwb.w * 100);
  const bk = Math.round(hwb.b * 100);
  const base = `hwb(${h} ${w}% ${bk}%`;
  if (oklch.a >= 1) return `${base})`;
  return `${base} / ${Math.round(oklch.a * 100)}%)`;
}

// ---------------------------------------------------------------------------
// Color space conversions
// ---------------------------------------------------------------------------

function linearToSrgb(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

function srgbToLinear(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function hslToSrgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh < 1) [r1, g1, b1] = [chroma, x, 0];
  else if (hh < 2) [r1, g1, b1] = [x, chroma, 0];
  else if (hh < 3) [r1, g1, b1] = [0, chroma, x];
  else if (hh < 4) [r1, g1, b1] = [0, x, chroma];
  else if (hh < 5) [r1, g1, b1] = [x, 0, chroma];
  else [r1, g1, b1] = [chroma, 0, x];
  const m = l - chroma / 2;
  return { r: r1 + m, g: g1 + m, b: b1 + m };
}

function srgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

function oklchToSrgb(
  L: number,
  C: number,
  hDeg: number,
): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = l_ * l_ * l_;
  const mCubed = m_ * m_ * m_;
  const sCubed = s_ * s_ * s_;

  const rLin =
    4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  const gLin =
    -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  const bLin =
    -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  return [linearToSrgb(rLin), linearToSrgb(gLin), linearToSrgb(bLin)];
}

function srgbToOklch(
  r: number,
  g: number,
  b: number,
  alpha: number,
): { l: number; c: number; h: number; a: number } {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);

  const lLms = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const mLms = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const sLms = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;

  const l_ = Math.cbrt(lLms);
  const m_ = Math.cbrt(mLms);
  const s_ = Math.cbrt(sLms);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const aAxis = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bAxis = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(aAxis * aAxis + bAxis * bAxis);
  let H = (Math.atan2(bAxis, aAxis) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { l: L, c: C, h: H, a: alpha };
}

function oklchToOklab(
  L: number,
  C: number,
  hDeg: number,
): { l: number; a: number; b: number } {
  const hRad = (hDeg * Math.PI) / 180;
  return { l: L, a: C * Math.cos(hRad), b: C * Math.sin(hRad) };
}

function oklabToOklch(
  L: number,
  a: number,
  b: number,
): { l: number; c: number; h: number } {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}

// Per CSS Color 4 spec, https://www.w3.org/TR/css-color-4/#hwb-to-rgb
function hwbToSrgb(
  h: number,
  w: number,
  b: number,
): { r: number; g: number; b: number } {
  if (w + b >= 1) {
    const gray = w / (w + b);
    return { r: gray, g: gray, b: gray };
  }
  const rgb = hslToSrgb(h, 1, 0.5);
  const scale = 1 - w - b;
  return {
    r: rgb.r * scale + w,
    g: rgb.g * scale + w,
    b: rgb.b * scale + w,
  };
}

function srgbToHwb(
  r: number,
  g: number,
  b: number,
): { h: number; w: number; b: number } {
  const hsl = srgbToHsl(r, g, b);
  const w = Math.min(r, g, b);
  const bk = 1 - Math.max(r, g, b);
  return { h: hsl.h, w, b: bk };
}

// ---------------------------------------------------------------------------
// Mode dispatchers
// ---------------------------------------------------------------------------

interface ParseResult {
  oklch: { l: number; c: number; h: number; a: number };
  mode: ColorMode;
}

function parseColor(value: string): ParseResult | null {
  const trimmed = value.trim();

  const oklch = parseOklch(trimmed);
  if (oklch) return { oklch, mode: "oklch" };

  const oklab = parseOklab(trimmed);
  if (oklab) {
    const polar = oklabToOklch(oklab.l, oklab.a, oklab.b);
    return {
      oklch: { l: polar.l, c: polar.c, h: polar.h, a: oklab.alpha },
      mode: "oklab",
    };
  }

  const hex = parseHex(trimmed);
  if (hex) {
    return { oklch: srgbToOklch(hex.r, hex.g, hex.b, hex.a), mode: "hex" };
  }

  const rgb = parseRgb(trimmed);
  if (rgb) {
    return { oklch: srgbToOklch(rgb.r, rgb.g, rgb.b, rgb.a), mode: "rgb" };
  }

  const hsl = parseHsl(trimmed);
  if (hsl) {
    const srgb = hslToSrgb(hsl.h, hsl.s, hsl.l);
    return {
      oklch: srgbToOklch(srgb.r, srgb.g, srgb.b, hsl.a),
      mode: "hsl",
    };
  }

  const hwb = parseHwb(trimmed);
  if (hwb) {
    const srgb = hwbToSrgb(hwb.h, hwb.w, hwb.b);
    return {
      oklch: srgbToOklch(srgb.r, srgb.g, srgb.b, hwb.a),
      mode: "hwb",
    };
  }

  return null;
}

/**
 * Runtime type guard for color strings. Narrows `string` to `ColorString`
 * and a literal `S` to `S & ColorLiteral<S>`.
 *
 * @example
 * const v: string = userInput
 * if (isColorString(v)) {
 *   // v is now typed ColorString
 * }
 */
function isColorString(value: string): value is ColorString;
function isColorString<S extends string>(
  value: S,
): value is S & ColorLiteral<S>;
function isColorString(value: string): boolean {
  return parseColor(value) !== null;
}

function formatColor(
  oklch: { l: number; c: number; h: number; a: number },
  mode: ColorMode,
): string {
  switch (mode) {
    case "oklch":
      return formatOklch(oklch);
    case "oklab":
      return formatOklab(oklch);
    case "hex":
      return formatHex(oklch, oklch.a < 1);
    case "rgb":
      return formatRgb(oklch);
    case "hsl":
      return formatHsl(oklch);
    case "hwb":
      return formatHwb(oklch);
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PAD_WIDTH = 240;
const PAD_HEIGHT = 160;
const CHROMA_MAX = 0.4;

function LcPad({
  l,
  c,
  h,
  onChange,
}: {
  l: number;
  c: number;
  h: number;
  onChange: (l: number, c: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(PAD_WIDTH, PAD_HEIGHT);
    for (let y = 0; y < PAD_HEIGHT; y++) {
      const lAtRow = 1 - y / (PAD_HEIGHT - 1);
      for (let x = 0; x < PAD_WIDTH; x++) {
        const cAtCol = (x / (PAD_WIDTH - 1)) * CHROMA_MAX;
        const [r, g, b] = oklchToSrgb(lAtRow, cAtCol, h);
        const i = (y * PAD_WIDTH + x) * 4;
        image.data[i] = r * 255;
        image.data[i + 1] = g * 255;
        image.data[i + 2] = b * 255;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [h]);

  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = clamp01((event.clientX - rect.left) / rect.width);
    const ny = clamp01((event.clientY - rect.top) / rect.height);
    onChange(1 - ny, nx * CHROMA_MAX);
  };

  const markerX = (c / CHROMA_MAX) * 100;
  const markerY = (1 - l) * 100;

  return (
    <div
      data-slot="color-picker-pad"
      role="application"
      aria-label="Lightness and chroma"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: 2D pad needs to be keyboard-focusable for arrow-key nudge
      tabIndex={0}
      className="relative w-full touch-none cursor-crosshair rounded border overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ height: PAD_HEIGHT }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        handlePointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons) handlePointer(event);
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.05 : 0.01;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onChange(l, Math.max(0, c - step * CHROMA_MAX));
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          onChange(l, Math.min(CHROMA_MAX, c + step * CHROMA_MAX));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          onChange(Math.min(1, l + step), c);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          onChange(Math.max(0, l - step), c);
        }
      }}
    >
      <canvas
        ref={canvasRef}
        width={PAD_WIDTH}
        height={PAD_HEIGHT}
        className="block h-full w-full"
      />
      <div
        aria-hidden="true"
        className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/40 pointer-events-none"
        style={{ left: `${markerX}%`, top: `${markerY}%` }}
      />
    </div>
  );
}

const HUE_GRADIENT = `linear-gradient(to right, oklch(0.7 0.18 0), oklch(0.7 0.18 60), oklch(0.7 0.18 120), oklch(0.7 0.18 180), oklch(0.7 0.18 240), oklch(0.7 0.18 300), oklch(0.7 0.18 360))`;

function HueStrip({
  h,
  onChange,
}: {
  h: number;
  onChange: (h: number) => void;
}) {
  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onChange(clamp01((event.clientX - rect.left) / rect.width) * 360);
  };

  return (
    <div
      data-slot="color-picker-hue"
      role="slider"
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(h)}
      tabIndex={0}
      className="relative h-4 w-full touch-none cursor-pointer rounded-[3px]"
      style={{ background: HUE_GRADIENT }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        handlePointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons) handlePointer(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onChange(Math.max(0, h - 1));
        if (event.key === "ArrowRight") onChange(Math.min(360, h + 1));
      }}
    >
      <div
        aria-hidden="true"
        className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-black/40 shadow pointer-events-none"
        style={{ left: `${(h / 360) * 100}%` }}
      />
    </div>
  );
}

const CHECKER_BG = `conic-gradient(#bbb 25%, #fff 0 50%, #bbb 0 75%, #fff 0) 0 0 / 10px 10px`;

function AlphaStrip({
  a,
  l,
  c,
  h,
  onChange,
}: {
  a: number;
  l: number;
  c: number;
  h: number;
  onChange: (next: number) => void;
}) {
  const handlePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onChange(clamp01((event.clientX - rect.left) / rect.width));
  };

  const color = `oklch(${l} ${c} ${h})`;
  const background = `linear-gradient(to right, transparent, ${color}), ${CHECKER_BG}`;

  return (
    <div
      data-slot="color-picker-alpha"
      role="slider"
      aria-label="Alpha"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(a * 100)}
      tabIndex={0}
      className="relative h-4 w-full touch-none cursor-pointer rounded-[3px]"
      style={{ background }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        handlePointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons) handlePointer(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onChange(clamp01(a - 0.01));
        if (event.key === "ArrowRight") onChange(clamp01(a + 0.01));
      }}
    >
      <div
        aria-hidden="true"
        className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border border-black/40 shadow pointer-events-none"
        style={{ left: `${a * 100}%` }}
      />
    </div>
  );
}

function ModeButtonGroup({
  mode,
  onChange,
}: {
  mode: ColorMode;
  onChange: (next: ColorMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Color format"
      className="flex gap-1 w-full justify-evenly items-center"
      data-slot="color-picker-modes"
    >
      {COLOR_MODES.map((m) => (
        <Button
          key={m}
          type="button"
          role="tab"
          aria-selected={m === mode}
          size="sm"
          variant={m === mode ? "secondary" : "ghost"}
          onClick={() => onChange(m)}
          className="h-7 px-2 font-mono text-xs"
        >
          {m}
        </Button>
      ))}
    </div>
  );
}

const PRESETS: ReadonlyArray<{
  l: number;
  c: number;
  h: number;
  name: string;
}> = [
  { l: 0.637, c: 0.237, h: 25.331, name: "red" },
  { l: 0.705, c: 0.213, h: 47.604, name: "orange" },
  { l: 0.769, c: 0.188, h: 70.08, name: "amber" },
  { l: 0.768, c: 0.233, h: 130.85, name: "lime" },
  { l: 0.696, c: 0.17, h: 162.48, name: "emerald" },
  { l: 0.715, c: 0.143, h: 215.221, name: "cyan" },
  { l: 0.623, c: 0.214, h: 259.815, name: "blue" },
  { l: 0.606, c: 0.25, h: 292.717, name: "violet" },
  { l: 0.667, c: 0.295, h: 322.15, name: "fuchsia" },
  { l: 0.656, c: 0.241, h: 354.308, name: "pink" },
];

function PresetPalette({
  onPick,
}: {
  onPick: (next: { l: number; c: number; h: number; a: number }) => void;
}) {
  return (
    <div
      data-slot="color-picker-presets"
      className="flex flex-1 items-center w-full justify-evenly gap-1.5"
    >
      {PRESETS.map((p) => (
        <button
          key={p.name}
          type="button"
          aria-label={`preset ${p.name}`}
          onClick={() => onPick({ l: p.l, c: p.c, h: p.h, a: 1 })}
          className="size-5 shrink-0 cursor-pointer rounded border transition hover:scale-110"
          style={{ backgroundColor: `oklch(${p.l} ${p.c} ${p.h})` }}
        />
      ))}
    </div>
  );
}

export {
  ColorPicker,
  type ColorPickerProps,
  clamp01,
  formatColor,
  formatHex,
  formatHsl,
  formatHwb,
  formatOklab,
  formatOklch,
  formatRgb,
  hslToSrgb,
  hwbToSrgb,
  isColorString,
  linearToSrgb,
  oklabToOklch,
  oklchToOklab,
  oklchToSrgb,
  type ParseResult,
  parseAlphaToken,
  parseColor,
  parseHex,
  parseHsl,
  parseHwb,
  parseOklab,
  parseOklch,
  parseRgb,
  srgbToHsl,
  srgbToHwb,
  srgbToLinear,
  srgbToOklch,
  trimNumber,
};
