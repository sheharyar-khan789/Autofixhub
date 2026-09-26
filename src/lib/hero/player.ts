/** Pure helpers for the scroll-driven canvas sequence (no DOM access; unit-tested). */

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Every `step`-th frame, always ending on the final frame so the sequence
 * finishes on the fully separated state even when frames are skipped.
 */
export function buildPlaylist<T>(frames: readonly T[], step: number): T[] {
  if (frames.length === 0) return [];
  const s = Math.max(1, Math.floor(step));
  const out: T[] = [];
  for (let i = 0; i < frames.length; i += s) out.push(frames[i]);
  const last = frames[frames.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

/** 0..1 progress through the pinned scroll range of the section. */
export function scrollProgress(sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const scrollable = sectionHeight - viewportHeight;
  return scrollable > 0 ? clamp01(-sectionTop / scrollable) : 0;
}

export function frameIndexFor(progress: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(clamp01(progress) * (count - 1))));
}

/** Frame-rate independent exponential easing toward the target progress. */
export function easeToward(current: number, target: number, dtMs: number, easeMs: number): number {
  const diff = target - current;
  if (easeMs <= 0 || Math.abs(diff) < 0.0002) return target;
  return current + diff * (1 - Math.exp(-Math.min(dtMs, 100) / easeMs));
}

/** Nearest already-loaded frame to `index` (so scrubbing never shows a blank canvas). */
export function nearestLoaded<T>(frames: readonly (T | null)[], index: number): T | null {
  if (frames[index]) return frames[index];
  for (let d = 1; d < frames.length; d++) {
    const a = frames[index - d];
    if (a) return a;
    const b = frames[index + d];
    if (b) return b;
  }
  return null;
}

/** "contain" fit of a source into a destination box, centred. */
export function containRect(srcW: number, srcH: number, dstW: number, dstH: number) {
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (dstW - w) / 2, y: (dstH - h) / 2, w, h };
}

/**
 * Scroll timeline of the exploded-view hero (all values are 0..1 section progress):
 * explode (frames first -> last), hold the exploded view (labels shown), then
 * recompose (frames last -> first) so the section ends on the complete car and
 * hands over cleanly to the next section.
 */
export const HERO_TIMELINE = { explodeEnd: 0.6, holdEnd: 0.8 } as const;

export function heroFrameProgress(progress: number): number {
  const p = clamp01(progress);
  const { explodeEnd, holdEnd } = HERO_TIMELINE;
  if (p <= explodeEnd) return p / explodeEnd;
  if (p <= holdEnd) return 1;
  return 1 - (p - holdEnd) / (1 - holdEnd);
}

/** Labels fade in over the last 15% of the explosion and out over the first 15% of recomposition. */
export function heroLabelOpacity(progress: number): number {
  return clamp01((heroFrameProgress(progress) - 0.85) / 0.15);
}

export interface PartLabel {
  id: string;
  name: string;
  /** Anchor on the part, as a fraction of the SOURCE image (720x1280), final exploded frame. */
  anchor: { x: number; y: number };
  side: "left" | "right";
  /** Vertical position of the label text, as a fraction of the image height (spaced to never overlap). */
  labelY: number;
}

/**
 * Parts that are clearly identifiable in the final exploded frame. Only visible,
 * unambiguous components are labelled; nothing is inferred beyond the imagery.
 */
export const HERO_PARTS: readonly PartLabel[] = [
  { id: "bonnet", name: "Bonnet", anchor: { x: 0.42, y: 0.2 }, side: "left", labelY: 0.2 },
  { id: "engine", name: "Petrol engine", anchor: { x: 0.43, y: 0.47 }, side: "left", labelY: 0.4 },
  { id: "suspension", name: "Front suspension", anchor: { x: 0.2, y: 0.56 }, side: "left", labelY: 0.58 },
  { id: "body", name: "Doors & body panels", anchor: { x: 0.9, y: 0.44 }, side: "right", labelY: 0.3 },
  { id: "hybrid", name: "High-voltage hybrid components", anchor: { x: 0.63, y: 0.48 }, side: "right", labelY: 0.47 },
  { id: "wheels", name: "Wheels & tyres", anchor: { x: 0.9, y: 0.67 }, side: "right", labelY: 0.66 },
];

/** Minimum free width (CSS px) beside the image for side labels; otherwise numbered markers + legend. */
export const SIDE_LABEL_MIN_SPACE = 170;

/**
 * The frames are portrait (720x1280) with empty studio space above and below the car.
 * Drawing only this vertical band (fractions of the source height) makes the vehicle
 * ~40% larger at every width. It contains every part in every frame: the lifted bonnet
 * starts at ~0.12 and the wheels/shadow end by ~0.76.
 */
export const HERO_CROP = { top: 0.08, bottom: 0.8 } as const;

/** Source-image y fraction -> fraction of the cropped band. */
export function cropY(y: number): number {
  return (y - HERO_CROP.top) / (HERO_CROP.bottom - HERO_CROP.top);
}

/** Space (CSS px) kept free under the car for the numbered legend on narrow stages. */
export const HERO_LEGEND_RESERVE = 112;

/** Top of the intact car's roof in the drawn crop band (frame 1: roof at ~37% of the source height). */
export const HERO_INTACT_ROOF = cropY(0.37);

/**
 * Narrative phase of the hero timeline, for the on-screen step indicator:
 * 1 intact, 2 separating, 3 exploded view (hold), 4 reassembling.
 */
export const HERO_PHASES = ["Intact", "Separating", "Exploded view", "Reassembly"] as const;
export const HERO_INTACT_END = 0.03;
export function heroPhase(progress: number): 1 | 2 | 3 | 4 {
  const p = clamp01(progress);
  if (p < HERO_INTACT_END) return 1;
  if (p < HERO_TIMELINE.explodeEnd) return 2;
  if (p < HERO_TIMELINE.holdEnd) return 3;
  return 4;
}

export interface HeroFitInput {
  /** Source crop size (only the aspect ratio matters). */
  srcW: number;
  srcH: number;
  /** Stage width and the y (CSS px) the car stands on. */
  stageW: number;
  floorY: number;
  /** Bottom edge of text laid over the top of the stage (0 = none). The intact roof must clear it. */
  textBottom?: number;
  /** Copy block in the bottom-left corner (wide layouts): the car stays to its right. */
  leftBlock?: { right: number } | null;
  /** Height kept free under the car for the compact legend. */
  legendReserve?: number;
  /** Space each side needs for side labels. */
  sideSpace?: number;
  gap?: number;
}

export interface HeroFit {
  x: number;
  y: number;
  w: number;
  h: number;
  mode: "side" | "compact";
}

/**
 * Where to draw the vehicle crop: standing on `floorY`, centred when possible, as large as
 * possible while the intact roof (HERO_INTACT_ROOF of the crop) stays below `textBottom`
 * (relaxed on very short stages rather than shrinking the car to a thumbnail) and the car
 * stays right of a bottom-left copy block. Side labels when both gutters fit without losing
 * more than 20% of the car's height; otherwise numbered markers + a legend below the car.
 */
export function fitHeroCar(input: HeroFitInput): HeroFit {
  const { srcW, srcH, stageW, floorY } = input;
  const textBottom = input.textBottom ?? 0;
  const gap = input.gap ?? 16;
  const side = input.sideSpace ?? SIDE_LABEL_MIN_SPACE;
  const minLeft = input.leftBlock ? input.leftBlock.right + gap : 0;
  const aspect = srcW / srcH;

  const place = (floor: number, minX: number, maxRight: number): Omit<HeroFit, "mode"> => {
    let h = floor;
    if (textBottom > 0) {
      const roofH = (floor - textBottom - gap) / (1 - HERO_INTACT_ROOF);
      if (roofH >= floor * 0.45) h = Math.min(h, roofH);
    }
    let w = h * aspect;
    const room = Math.max(1, maxRight - minX);
    if (w > room) {
      w = room;
      h = w / aspect;
    }
    const x = Math.min(Math.max((stageW - w) / 2, minX), maxRight - w);
    return { x, y: floor - h, w, h };
  };

  const free = place(floorY, minLeft, stageW);
  const withLabels = place(floorY, Math.max(minLeft, side), stageW - side);
  if (withLabels.h >= free.h * 0.8) return { ...withLabels, mode: "side" };
  return { ...place(Math.max(1, floorY - (input.legendReserve ?? 0)), minLeft, stageW), mode: "compact" };
}
