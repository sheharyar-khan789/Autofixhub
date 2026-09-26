import { describe, expect, it } from "vitest";
import {
  buildPlaylist, containRect, cropY, easeToward, frameIndexFor, HERO_CROP, HERO_PARTS, HERO_TIMELINE, heroFrameProgress, heroLabelOpacity, heroPhase, HERO_PHASES, fitHeroCar, HERO_INTACT_ROOF,
  nearestLoaded, scrollProgress,
} from "@/lib/hero/player";

const frames = Array.from({ length: 194 }, (_, i) => `f${i}`);

describe("playlist", () => {
  it("uses every frame on desktop", () => expect(buildPlaylist(frames, 1)).toEqual(frames));
  it("uses every second frame on mobile and still ends on the last frame", () => {
    const p = buildPlaylist(frames, 2);
    expect(p).toHaveLength(98); // 97 even indexes + final frame (index 193)
    expect(p[0]).toBe("f0");
    expect(p[1]).toBe("f2");
    expect(p.at(-1)).toBe("f193");
  });
  it("does not duplicate the last frame when it already lands on the step", () => {
    expect(buildPlaylist(["a", "b", "c"], 2)).toEqual(["a", "c"]);
  });
  it("handles empty input", () => expect(buildPlaylist([], 2)).toEqual([]));
});

describe("scroll mapping", () => {
  const H = 4000, V = 1000;
  it("is 0 before the section reaches the top", () => expect(scrollProgress(200, H, V)).toBe(0));
  it("is 1 at the end of the pinned range", () => expect(scrollProgress(-(H - V), H, V)).toBe(1));
  it("clamps beyond the end", () => expect(scrollProgress(-9999, H, V)).toBe(1));
  it("is linear in between", () => expect(scrollProgress(-1500, H, V)).toBeCloseTo(0.5));
  it("is safe when the section is not taller than the viewport (reduced motion)", () => expect(scrollProgress(0, 800, 900)).toBe(0));
  it("maps progress to a frame index across the full range", () => {
    expect(frameIndexFor(0, 194)).toBe(0);
    expect(frameIndexFor(1, 194)).toBe(193);
    expect(frameIndexFor(0.5, 194)).toBe(97);
    expect(frameIndexFor(-1, 194)).toBe(0);
    expect(frameIndexFor(2, 194)).toBe(193);
    expect(frameIndexFor(0.7, 1)).toBe(0);
  });
});

describe("easing", () => {
  it("converges monotonically and snaps when close", () => {
    let v = 0;
    for (let i = 0; i < 200; i++) {
      const n = easeToward(v, 1, 16, 90);
      expect(n).toBeGreaterThanOrEqual(v);
      v = n;
    }
    expect(v).toBe(1);
  });
  it("jumps immediately with zero ease time", () => expect(easeToward(0, 0.8, 16, 0)).toBe(0.8));
});

describe("nearestLoaded", () => {
  it("returns the exact frame when present", () => expect(nearestLoaded(["a", null, "c"], 2)).toBe("c"));
  it("falls back to the closest loaded neighbour", () => {
    expect(nearestLoaded(["a", null, null, null, "e"], 3)).toBe("e");
    expect(nearestLoaded(["a", null, null, null, null], 4)).toBe("a");
  });
  it("returns null when nothing is loaded", () => expect(nearestLoaded([null, null], 1)).toBeNull());
});

describe("containRect", () => {
  it("fits a 720x1280 portrait frame inside a landscape stage without distortion", () => {
    const r = containRect(720, 1280, 1000, 800);
    expect(r.h).toBeCloseTo(800);
    expect(r.w / r.h).toBeCloseTo(720 / 1280);
    expect(r.x).toBeCloseTo((1000 - r.w) / 2);
    expect(r.y).toBe(0);
  });
});

describe("exploded-view timeline", () => {
  it("explodes, holds, then recomposes to the complete car", () => {
    expect(heroFrameProgress(0)).toBe(0);
    expect(heroFrameProgress(0.3)).toBeCloseTo(0.5);
    expect(heroFrameProgress(HERO_TIMELINE.explodeEnd)).toBe(1);
    expect(heroFrameProgress(0.7)).toBe(1);
    expect(heroFrameProgress(HERO_TIMELINE.holdEnd)).toBe(1);
    expect(heroFrameProgress(0.9)).toBeCloseTo(0.5);
    expect(heroFrameProgress(1)).toBe(0);
    expect(heroFrameProgress(-1)).toBe(0);
    expect(heroFrameProgress(2)).toBe(0);
  });
  it("is continuous (no jumps a user could see) across the whole range", () => {
    let prev = heroFrameProgress(0);
    for (let p = 0.001; p <= 1; p += 0.001) {
      const v = heroFrameProgress(p);
      expect(Math.abs(v - prev)).toBeLessThan(0.02);
      prev = v;
    }
  });
  it("shows labels only around the fully exploded state", () => {
    expect(heroLabelOpacity(0)).toBe(0);
    expect(heroLabelOpacity(0.3)).toBe(0);
    expect(heroLabelOpacity(0.7)).toBe(1);
    expect(heroLabelOpacity(1)).toBe(0);
    expect(heroLabelOpacity(0.55)).toBeGreaterThan(0);
  });
  it("labels are balanced left/right, inside the image, and never overlap on a side", () => {
    const left = HERO_PARTS.filter((p) => p.side === "left");
    const right = HERO_PARTS.filter((p) => p.side === "right");
    expect(left.length).toBe(right.length);
    for (const p of HERO_PARTS) {
      for (const v of [p.anchor.x, p.anchor.y, p.labelY]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    for (const side of [left, right]) {
      const ys = side.map((p) => p.labelY).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(0.1);
    }
  });
});

describe("hero crop", () => {
  it("keeps every labelled part (anchor and label row) inside the cropped band", () => {
    for (const p of HERO_PARTS) {
      for (const y of [p.anchor.y, p.labelY]) {
        expect(cropY(y), p.id).toBeGreaterThan(0.02);
        expect(cropY(y), p.id).toBeLessThan(0.98);
      }
    }
  });
  it("maps the band edges to 0 and 1", () => {
    expect(cropY(HERO_CROP.top)).toBe(0);
    expect(cropY(HERO_CROP.bottom)).toBeCloseTo(1);
  });
});

describe("hero phase indicator", () => {
  it("follows the timeline: intact, separating, exploded hold, reassembly", () => {
    expect(heroPhase(0)).toBe(1);
    expect(heroPhase(0.2)).toBe(2);
    expect(heroPhase(0.59)).toBe(2);
    expect(heroPhase(0.6)).toBe(3);
    expect(heroPhase(0.79)).toBe(3);
    expect(heroPhase(0.8)).toBe(4);
    expect(heroPhase(1)).toBe(4);
    expect(heroPhase(-1)).toBe(1);
    expect(HERO_PHASES).toHaveLength(4);
  });
});

describe("hero car fit", () => {
  const src = { srcW: 720, srcH: 1280 * 0.72 };
  it("wide: centred car on the floor, right of the bottom-left copy, roof below the headline, side labels", () => {
    const f = fitHeroCar({ ...src, stageW: 1440, floorY: 772, textBottom: 220, leftBlock: { right: 424 } });
    expect(f.mode).toBe("side");
    expect(f.x).toBeGreaterThanOrEqual(440);
    expect(f.x + f.w).toBeLessThanOrEqual(1440 - 170);
    expect(f.y + f.h).toBeCloseTo(772);
    expect(f.y + HERO_INTACT_ROOF * f.h).toBeGreaterThanOrEqual(236);
    expect(f.h).toBeGreaterThan(600);
  });
  it("phone: near full-width car between the headline and the calls to action, markers + legend", () => {
    const f = fitHeroCar({ ...src, stageW: 390, floorY: 560, textBottom: 170, legendReserve: 0 });
    expect(f.mode).toBe("compact");
    expect(f.w).toBeGreaterThan(340);
    expect(f.y + f.h).toBeCloseTo(560);
    expect(f.y + HERO_INTACT_ROOF * f.h).toBeGreaterThanOrEqual(186);
  });
  it("short screen: does not shrink the car to a thumbnail to clear the text", () => {
    const f = fitHeroCar({ ...src, stageW: 320, floorY: 330, textBottom: 250 });
    expect(f.h).toBeGreaterThan(250);
  });
});
