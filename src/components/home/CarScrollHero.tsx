"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import manifest from "../../../public/animation/corolla/manifest.json";
import {
  buildPlaylist,
  cropY,
  easeToward,
  fitHeroCar,
  frameIndexFor,
  HERO_CROP,
  HERO_LEGEND_RESERVE,
  HERO_PARTS,
  heroFrameProgress,
  heroLabelOpacity,
  heroPhase,
  nearestLoaded,
  scrollProgress,
} from "@/lib/hero/player";

const FRAME_BASE = "/animation/corolla/";
const MOBILE_MAX_WIDTH = 767;
const MOBILE_FRAME_STEP = 2;
const MAX_DPR = 2;
const EASE_MS = 90;
const LOAD_CONCURRENCY = 6;
/** Space under the car on wide screens for the centred caption line. */
const CAPTION_BAND = 56;

type Status = "loading" | "ready" | "error";

/** Image box inside the stage, in CSS pixels (drives the label overlay; changes only on resize). */
interface Overlay {
  left: number;
  top: number;
  width: number;
  height: number;
  stageWidth: number;
  mode: "side" | "compact";
}

/**
 * Scroll-linked canvas sequence.
 * - Sticky viewport inside a 400vh section; scroll progress maps to a frame index.
 * - Frame 1 loads first and is drawn immediately; the rest stream in behind it.
 * - rAF runs only while the eased progress is still moving, and the canvas is
 *   repainted only when the frame index (or canvas size) changes.
 * - Mobile (<768px) uses every second frame; reduced motion shows one static frame.
 */
export interface HeroSpec {
  label: string;
  value: string;
}

/** Composition (after the three hero references in /hero-section, not their branding):
 *  headline top left, a large wordmark behind a centred car standing in a pool of light,
 *  supporting copy + calls to action bottom left, a spec column on the right and a small
 *  centred line under the car. */
export function CarScrollHero({
  children,
  actions,
  specs = [],
  wordmark,
  caption,
}: {
  /** Eyebrow + headline (top left). */
  children: ReactNode;
  /** Supporting copy + calls to action (bottom left). */
  actions?: ReactNode;
  /** Short factual notes (right column, wide screens). */
  specs?: HeroSpec[];
  /** Large brand word set behind the vehicle. */
  wordmark?: string;
  caption: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [pct, setPct] = useState(0);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  /** Latest label opacity (already gated), so labels mounted later (e.g. after a resize) start correct. */
  const labelOpacityRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!section || !sticky || !stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("CarScrollHero: 2D canvas context unavailable");
      setStatus("error");
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
    const fullList = buildPlaylist(manifest.frames, mobile ? MOBILE_FRAME_STEP : 1);
    const playlist = reduced ? [fullList[0]] : fullList;
    const count = playlist.length;
    const frames: (HTMLImageElement | null)[] = new Array(count).fill(null);
    canvas.dataset.frameCount = String(count);
    canvas.dataset.mode = reduced ? "static" : mobile ? "mobile" : "full";

    let disposed = false;
    let raf = 0;
    let lastTime = 0;
    let target = 0;
    let smooth = 0;
    let lastDrawn = -1;
    let needsRedraw = true;
    let box = { x: 0, y: 0, w: 0, h: 0 };
    let cw = 0;
    let ch = 0;
    let settled = 0;
    let failed = 0;

    const layout = () => {
      const ref = frames.find(Boolean);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(stage.clientWidth * dpr));
      const h = Math.max(1, Math.round(stage.clientHeight * dpr));
      if (w !== cw || h !== ch) {
        cw = w;
        ch = h;
        canvas.width = w;
        canvas.height = h;
      }
      let mode: Overlay["mode"] = "side";
      if (ref) {
        // Offsets (not getBoundingClientRect) so the fade/scale transforms never skew the fit.
        const offsetIn = (el: HTMLElement) => {
          let x = 0;
          let y = 0;
          for (let e: HTMLElement | null = el; e && e !== sticky; e = e.offsetParent as HTMLElement | null) {
            x += e.offsetLeft;
            y += e.offsetTop;
          }
          return { x, y };
        };
        const origin = offsetIn(stage);
        const stageH = ch / dpr;
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        const head = headRef.current;
        const acts = actionsRef.current;
        const textBottom = head ? offsetIn(head).y + head.offsetHeight - origin.y : 0;
        // The wordmark never rides up into the headline (see .hero-wordmark).
        sticky.style.setProperty("--text-bottom", `${(origin.y + Math.max(0, textBottom) + 12).toFixed(1)}px`);
        let floorY = stageH - (wide ? CAPTION_BAND : 0);
        let leftBlock: { right: number } | null = null;
        let legendReserve = reduced ? 0 : HERO_LEGEND_RESERVE;
        if (acts) {
          const a = offsetIn(acts);
          if (wide) {
            leftBlock = { right: a.x + acts.offsetWidth - origin.x };
          } else {
            // Phones/tablets: the car stands above the calls to action; while exploded the
            // legend takes their place (they step aside), so it needs no extra reserve.
            const actionsTop = a.y - origin.y;
            floorY = Math.min(actionsTop - 12, stageH - legendReserve);
            legendReserve = 0;
          }
        }
        // Only the vertical band that contains the vehicle is drawn (see HERO_CROP).
        const fit = fitHeroCar({
          srcW: ref.naturalWidth,
          srcH: ref.naturalHeight * (HERO_CROP.bottom - HERO_CROP.top),
          stageW: cw / dpr,
          floorY: Math.max(1, floorY),
          textBottom: Math.max(0, textBottom),
          leftBlock,
          legendReserve,
        });
        mode = fit.mode;
        box = { x: fit.x * dpr, y: fit.y * dpr, w: fit.w * dpr, h: fit.h * dpr };
      }
      needsRedraw = true;
      if (ref) {
        // Publish the drawn vehicle box (relative to the sticky viewport) for the studio
        // environment layers. Offsets ignore CSS transforms, so they stay stable while scrolling.
        let ox = 0;
        let oy = 0;
        for (let el: HTMLElement | null = stage; el && el !== sticky; el = el.offsetParent as HTMLElement | null) {
          ox += el.offsetLeft;
          oy += el.offsetTop;
        }
        const set = (k: string, v: number) => sticky.style.setProperty(k, `${v.toFixed(1)}px`);
        set("--car-cx", ox + (box.x + box.w / 2) / dpr);
        set("--car-top", oy + box.y / dpr);
        set("--car-w", box.w / dpr);
        set("--car-h", box.h / dpr);
      }
      if (ref && !reduced) {
        const next: Overlay = {
          left: box.x / dpr,
          top: box.y / dpr,
          width: box.w / dpr,
          height: box.h / dpr,
          stageWidth: stage.clientWidth,
          mode,
        };
        setOverlay((prev) =>
          prev && Math.abs(prev.left - next.left) < 0.5 && Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5 && prev.stageWidth === next.stageWidth ? prev : next,
        );
      }
    };

    // Scroll-driven depth (camera push-in, ground shadow, glow, background parallax) is
    // driven by two CSS variables on the section: no React re-render, no layout work.
    let lastPhase = 0;
    const applyDepth = (progress: number) => {
      if (reduced) return;
      section.style.setProperty("--hero-p", progress.toFixed(4));
      section.style.setProperty("--hero-fp", heroFrameProgress(progress).toFixed(4));
      const phase = heroPhase(progress);
      if (phase !== lastPhase) {
        lastPhase = phase;
        section.dataset.phase = String(phase);
      }
    };

    // Label visibility is written straight to the DOM from the rAF loop (no React re-render per frame).
    const applyLabels = (progress: number) => {
      // Labels point at exploded parts: never show them over a different frame.
      const o = frames[count - 1] ? heroLabelOpacity(progress) : 0;
      labelOpacityRef.current = o;
      const el = labelsRef.current;
      if (!el) return;
      el.style.opacity = String(o);
      el.dataset.visible = o > 0.5 ? "true" : "false";
    };

    const draw = (index: number) => {
      const img = nearestLoaded(frames, index);
      if (!img) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const sy = img.naturalHeight * HERO_CROP.top;
      const sh = img.naturalHeight * (HERO_CROP.bottom - HERO_CROP.top);
      ctx.drawImage(img, 0, sy, img.naturalWidth, sh, box.x, box.y, box.w, box.h);

      // Feather the frame's own edges into the page background. Only sides that sit
      // inside the canvas are faded; sides that touch the canvas edge stay solid.
      const fadeX = box.x > 2 ? 0.2 : 0;
      // The crop band always has a top and bottom edge to soften; the top carries the
      // frame's own overhead light, so it gets the longer fade.
      const fadeTop = 0.16;
      const fadeBottom = 0.07;
      ctx.globalCompositeOperation = "destination-in";
      if (fadeX > 0) {
        const g = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(fadeX, "#000");
        g.addColorStop(1 - fadeX, "#000");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
      {
        const g = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(fadeTop, "#000");
        g.addColorStop(1 - fadeBottom, "#000");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(box.x, box.y, box.w, box.h);
      }
      ctx.globalCompositeOperation = "source-over";
      canvas.dataset.frameIndex = String(index);
    };

    const readScroll = () => {
      const rect = section.getBoundingClientRect();
      target = scrollProgress(rect.top, rect.height, window.innerHeight);
    };

    const tick = (time: number) => {
      raf = 0;
      const dt = lastTime ? time - lastTime : 16;
      lastTime = time;
      smooth = easeToward(smooth, target, dt, EASE_MS);
      const index = frameIndexFor(heroFrameProgress(smooth), count);
      applyLabels(smooth);
      applyDepth(smooth);
      if (index !== lastDrawn || needsRedraw) {
        draw(index);
        lastDrawn = index;
        needsRedraw = false;
      }
      // Keep looping only while the eased value is still travelling.
      if (Math.abs(target - smooth) > 0.0002) raf = requestAnimationFrame(tick);
      else lastTime = 0;
    };
    const schedule = () => {
      if (!raf && !disposed) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      readScroll();
      schedule();
    };
    const onResize = () => {
      layout();
      readScroll();
      schedule();
    };

    const inFlight = new Map<HTMLImageElement, () => void>();
    const loadFrame = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        inFlight.set(img, resolve);
        img.onload = () => {
          inFlight.delete(img);
          frames[i] = img;
          resolve();
        };
        img.onerror = () => {
          inFlight.delete(img);
          if (disposed) return resolve(); // cancelled on unmount, not a failure
          failed++;
          console.error(`CarScrollHero: frame failed to load: ${playlist[i]}`);
          resolve();
        };
        img.src = FRAME_BASE + playlist[i];
      }).then(() => {
        settled++;
        if (!disposed) setPct(Math.round((settled / count) * 100));
      });

    let ro: ResizeObserver | undefined;
    (async () => {
      // Portrait layouts size the car around the headline, so wait (briefly) for web fonts
      // too: otherwise the car would visibly re-fit when the font swaps in.
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      await Promise.all([loadFrame(0), Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))])]);
      if (disposed) return;
      if (!frames[0]) {
        setStatus("error");
        return;
      }
      layout();
      readScroll();
      smooth = target;
      draw(frameIndexFor(heroFrameProgress(smooth), count));
      lastDrawn = frameIndexFor(heroFrameProgress(smooth), count);
      applyLabels(smooth);
      applyDepth(smooth);
      needsRedraw = false;
      setStatus("ready");

      if (!reduced) {
        window.addEventListener("scroll", onScroll, { passive: true });
      }
      window.addEventListener("resize", onResize);
      ro = new ResizeObserver(onResize);
      ro.observe(stage);
      // Text size (font load, wrapping) changes where the car can stand.
      if (headRef.current) ro.observe(headRef.current);
      if (actionsRef.current) ro.observe(actionsRef.current);

      // Stream the remaining frames with bounded concurrency.
      // The final (exploded) frame next, so the labelled view is ready early; then the rest in order.
      if (count > 1) {
        await loadFrame(count - 1);
        if (disposed) return;
        applyLabels(smooth);
      }
      let next = 1;
      const worker = async () => {
        while (!disposed && next < count - 1) {
          const i = next++;
          await loadFrame(i);
          // A newly arrived frame may be the one currently wanted.
          if (i === lastDrawn || Math.abs(i - lastDrawn) < 2) {
            needsRedraw = true;
            schedule();
          }
        }
      };
      await Promise.all(Array.from({ length: LOAD_CONCURRENCY }, worker));
      if (disposed) return;
      if (failed > 0) console.error(`CarScrollHero: ${failed} of ${count} frames failed to load`);
      needsRedraw = true;
      schedule();
    })();

    return () => {
      disposed = true;
      // Stop downloading frames nobody will see (e.g. client-side navigation away mid-load).
      for (const [img, resolve] of inFlight) {
        img.onload = img.onerror = null;
        img.removeAttribute("src");
        resolve();
      }
      inFlight.clear();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="hero-scroll relative -mt-[var(--header-h)] h-[500vh]"
      data-phase="1"
      aria-label="Toyota Corolla Hybrid scroll animation"
      data-testid="hero-scroll"
    >
      <div ref={stickyRef} className="hero-sticky sticky top-0 h-dvh overflow-hidden pt-[var(--header-h)]">
        {/*
          Environment, placed around the drawn vehicle (--car-* set on resize): deep graphite,
          smoky backlight behind the body, the brand word set behind the car, a spotlight
          pool on the floor and a vignette. The vehicle layer is composited with "lighten",
          so the frames' dark studio backdrop gives way to this scene and the car stands in it.
        */}
        <div aria-hidden="true" className="hero-env pointer-events-none absolute inset-0">
          <div className="hero-backlight absolute inset-0" />
          {wordmark && <Wordmark text={wordmark} />}
          <div className="hero-pool absolute" />
          <div className="hero-haze absolute inset-0" />
        </div>

        <div className="hero-frame relative h-full">
          <div className="hero-stage absolute inset-x-0 top-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-0">
            <div ref={stageRef} className="hero-depth absolute inset-0">
              <canvas
                ref={canvasRef}
                className="h-full w-full"
                role="img"
                aria-label="A Toyota Corolla Hybrid separating into its main components as you scroll"
                data-testid="hero-canvas"
              />
              {overlay && status === "ready" && <PartLabels overlay={overlay} labelsRef={labelsRef} opacityRef={labelOpacityRef} />}
              {status !== "ready" && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-space-md text-text-muted"
                  role="status"
                  aria-live="polite"
                  data-testid="hero-loader"
                >
                  {status === "loading" ? (
                    <>
                      <p className="font-code text-label-code">
                        Loading vehicle animation… <span className="tabular-nums">{pct}%</span>
                      </p>
                      <div className="h-px w-44 max-w-[50vw] overflow-hidden bg-border-medium">
                        <div className="h-full origin-left bg-text-primary" style={{ transform: `scaleX(${pct / 100})` }} />
                      </div>
                    </>
                  ) : (
                    <p className="max-w-xs text-center text-body-sm">
                      The vehicle animation could not be loaded. The rest of the page still works.
                    </p>
                  )}
                </div>
              )}
              {status === "ready" && pct < 100 && (
                <p className="pointer-events-none absolute left-1/2 top-space-sm -translate-x-1/2 rounded bg-surface-raised px-space-sm py-1 font-code text-label-badge text-text-muted" role="status">
                  Loading frames {pct}%
                </p>
              )}
            </div>
            <p className="hero-caption hero-caption-centred pointer-events-none absolute bottom-8 hidden whitespace-nowrap font-code text-label-badge uppercase tracking-[0.32em] text-text-muted/80 lg:block">
              {caption}
            </p>
          </div>

          <div className="hero-overlay pointer-events-none relative mx-auto flex h-full max-w-[1440px] flex-col px-gutter pb-[calc(4.5rem+env(safe-area-inset-bottom)+2rem)] pt-space-md sm:pt-space-lg lg:pb-10 lg:pt-12">
            <div ref={headRef} className="hero-copy pointer-events-auto relative z-10 flex max-w-[44rem] flex-col gap-space-sm lg:gap-space-md">
              {children}
            </div>
            {actions && (
              <div ref={actionsRef} className="hero-copy pointer-events-auto relative z-10 mt-auto flex max-w-md flex-col gap-space-md lg:max-w-[28rem]">
                {actions}
              </div>
            )}
            {specs.length > 0 && (
              <dl className="hero-copy absolute bottom-10 right-gutter hidden flex-col items-end gap-space-lg text-right xl:flex">
                {specs.map((sp) => (
                  <div key={sp.label} className="flex flex-col items-end gap-space-xs">
                    <dt className="font-headline text-[1.375rem] font-light leading-tight tracking-[-0.01em] text-text-primary">{sp.label}</dt>
                    <span className="h-px w-12 bg-text-primary/60" aria-hidden="true" />
                    <dd className="max-w-[15rem] text-body-sm text-text-muted">{sp.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <p className="hero-caption pointer-events-none absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.625rem)] whitespace-nowrap text-center font-code text-[0.5625rem] uppercase tracking-[0.1em] text-text-muted/70 min-[400px]:text-[0.625rem] min-[400px]:tracking-[0.2em] lg:hidden">
            {caption}
          </p>
          <p className="sr-only">
            As you scroll, the car separates into an exploded view showing: {HERO_PARTS.map((p) => p.name).join(", ")}. It then
              reassembles.
            </p>
        </div>
      </div>
    </section>
  );
}

/**
 * The brand word set large behind the vehicle. An SVG whose width follows the stage, so
 * any trading name fits edge to edge without wrapping; glyph spacing is fitted to the box.
 * Masked (see .hero-wordmark) so it reads as passing behind the car's body.
 */
function Wordmark({ text }: { text: string }) {
  const w = Math.max(1, text.length) * 56;
  return (
    <div className="hero-wordmark absolute inset-x-0 px-gutter" style={{ "--wm-ratio": 100 / w } as React.CSSProperties}>
      <svg viewBox={`0 0 ${w} 100`} className="block h-auto w-full overflow-visible" aria-hidden="true">
        <text
          x={w / 2}
          y="84"
          textAnchor="middle"
          textLength={w}
          lengthAdjust="spacingAndGlyphs"
          className="hero-wordmark-text"
        >
          {text}
        </text>
      </svg>
    </div>
  );
}

/**
 * Technical-diagram labels for the exploded view. Positions come from the image box
 * (resize only); visibility comes from the rAF loop via `labelsRef` (opacity). Wide
 * stages get side labels with leader lines; narrow ones get numbered markers + legend.
 */
function PartLabels({
  overlay,
  labelsRef,
  opacityRef,
}: {
  overlay: Overlay;
  labelsRef: React.RefObject<HTMLDivElement | null>;
  opacityRef: React.RefObject<number>;
}) {
  const { left, top, width, height, stageWidth, mode } = overlay;
  // On (re)mount, start from the current scroll state instead of waiting for the next frame.
  useLayoutEffect(() => {
    const el = labelsRef.current;
    if (!el) return;
    const o = opacityRef.current;
    el.style.opacity = String(o);
    el.dataset.visible = o > 0.5 ? "true" : "false";
  }, [overlay, labelsRef, opacityRef]);
  // Part positions are defined on the full source frame; map them into the drawn crop band.
  const at = (fx: number, fy: number) => ({ x: left + fx * width, y: top + cropY(fy) * height });
  const GAP = 14;
  return (
    <div
      ref={labelsRef}
      aria-hidden="true"
      data-testid="hero-labels"
      data-mode={mode}
      data-visible="false"
      className="pointer-events-none absolute inset-0 transition-opacity duration-150 motion-reduce:transition-none"
      style={{ opacity: 0 }}
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {HERO_PARTS.map((p, i) => {
          const a = at(p.anchor.x, p.anchor.y);
          if (mode === "compact") return null;
          const ly = top + cropY(p.labelY) * height;
          const lx = p.side === "left" ? left - GAP : left + width + GAP;
          return (
            <g key={p.id}>
              <polyline
                points={`${lx},${ly} ${p.side === "left" ? lx + 12 : lx - 12},${ly} ${a.x},${a.y}`}
                fill="none"
                stroke="rgba(245,245,242,0.42)"
                strokeWidth="1"
              />
              <circle cx={a.x} cy={a.y} r="7" fill="rgba(12,14,16,0.35)" stroke="rgba(245,245,242,0.7)" strokeWidth="1" />
              <circle cx={a.x} cy={a.y} r="2.5" fill="#d71920" />
              <title>{`${i + 1}. ${p.name}`}</title>
            </g>
          );
        })}
      </svg>
      {mode === "side"
        ? HERO_PARTS.map((p, i) => {
            const ly = top + cropY(p.labelY) * height;
            const maxWidth = Math.min(210, left - GAP - 8);
            const style =
              p.side === "left"
                ? { top: ly, right: stageWidth - (left - GAP) + 2, maxWidth, textAlign: "right" as const }
                : { top: ly, left: left + width + GAP + 2, maxWidth };
            return (
              <span
                key={p.id}
                className="absolute flex -translate-y-1/2 flex-col gap-0.5 font-code uppercase leading-tight"
                style={style}
              >
                <span className="text-label-badge tabular-nums tracking-[0.18em] text-status-fault-red">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-label-telemetry font-semibold tracking-[0.12em] text-text-primary">{p.name}</span>
              </span>
            );
          })
        : (
          <>
            {HERO_PARTS.map((p, i) => {
              const a = at(p.anchor.x, p.anchor.y);
              return (
                <span
                  key={p.id}
                  className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-text-primary/80 bg-surface-container-lowest/85 font-code text-label-badge font-bold text-text-primary shadow-[0_0_0_3px_rgb(215_25_32/0.55)]"
                  style={{ left: a.x, top: a.y }}
                >
                  {i + 1}
                </span>
              );
            })}
            <ol
              className="absolute inset-x-0 grid grid-cols-2 gap-x-space-sm gap-y-1 border-t border-border-subtle/70 px-gutter pt-space-sm text-[0.75rem] leading-snug text-text-primary min-[360px]:text-[0.8125rem] sm:text-body-sm lg:px-space-xs"
              style={{ top: top + height + 6 }}
            >
              {HERO_PARTS.map((p, i) => (
                <li key={p.id} className="flex gap-space-xs">
                  <span className="font-code text-label-badge font-bold leading-[inherit] tabular-nums text-status-fault-red">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {p.name}
                </li>
              ))}
            </ol>
          </>
        )}
    </div>
  );
}
