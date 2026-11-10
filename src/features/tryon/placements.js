// Pure geometry for the virtual try-on (no React, no canvas). Everything is computed in PIXELS of the preview canvas.
//
// MediaPipe's face mesh has NO ears. Ear placements are therefore estimated from the face-edge landmarks
// (234 / 454) and the eyebrow-to-nose-base height, which is where ears sit on almost every face. They are
// a visual guide only; the customer can nudge them with the sliders and the piercer decides the real spot.

export const SHAPES = {
  stud: "Stud",
  hoop: "Hoop / ring",
  drop: "Drop",
  barbell: "Straight barbell",
  curved: "Curved barbell",
  horseshoe: "Horseshoe ring",
};

const ALL_SINGLE = ["stud", "hoop"];

// Navel sits this far from the shoulder midpoint (0) to the hip midpoint (1). Easy to tweak.
export const NAVEL_TORSO_FRACTION = 0.62;
export const NAVEL_HINT = "Step back and show your stomach in the camera.";
const NAVEL_MIN_VISIBILITY = 0.5; // pose landmarks below this are treated as not in view

// t  = how far down the ear (0 = eyebrow height, 1 = nose-base height)
// ox = how far outward from the face edge, as a fraction of face width
const EAR = {
  lobe: { marks: [{ t: 0.93, ox: 0.045 }] },
  "upper-lobe": { marks: [{ t: 0.8, ox: 0.05 }] },
  "stacked-lobe": { marks: [{ t: 0.82, ox: 0.05 }, { t: 0.95, ox: 0.044 }] },
  helix: { marks: [{ t: 0.12, ox: 0.085 }] },
  "vertical-helix": { marks: [{ ends: [{ t: 0.035, ox: 0.075 }, { t: 0.195, ox: 0.083 }] }] },
  flat: { marks: [{ t: 0.25, ox: 0.06 }] },
  conch: { marks: [{ t: 0.43, ox: 0.035 }] },
  tragus: { marks: [{ t: 0.5, ox: 0.012 }] },
  rook: { marks: [{ t: 0.3, ox: 0.045, ends: [{ t: 0.265, ox: 0.045 }, { t: 0.335, ox: 0.049 }] }] },
  daith: { marks: [{ t: 0.38, ox: 0.03 }] },
  industrial: { marks: [{ ends: [{ t: 0.23, ox: 0.04 }, { t: 0.08, ox: 0.1 }] }] },
};

const EAR_NOTE =
  "Ear placements are estimated from the face outline because the camera model does not map ears. Use the sliders to line it up with your ear; your piercer decides the exact spot.";

export const PLACEMENTS = [
  { id: "lobe", label: "Lobe", group: "Ear", kind: "ear", names: ["lobe", "lobes"], shapes: ["stud", "hoop", "drop"], defaultShape: "stud", hoopMode: "hang", sideMode: "pair", scale: 1 },
  { id: "upper-lobe", label: "Upper lobe", group: "Ear", kind: "ear", names: ["upper lobe", "upper lobes", "upperlobes"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "hang", sideMode: "pair", scale: 0.85 },
  { id: "stacked-lobe", label: "Stacked lobe", group: "Ear", kind: "ear", names: ["stacked lobe", "stacked lobes"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "hang", sideMode: "pair", scale: 0.8 },
  { id: "helix", label: "Helix", group: "Ear", kind: "ear", names: ["helix"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "ring", sideMode: "pair", scale: 0.8 },
  { id: "vertical-helix", label: "Vertical helix", group: "Ear", kind: "ear", names: ["vertical helix"], shapes: ["barbell", "curved"], defaultShape: "barbell", sideMode: "pair", scale: 0.75 },
  { id: "flat", label: "Flat", group: "Ear", kind: "ear", names: ["flat"], shapes: ["stud"], defaultShape: "stud", sideMode: "pair", scale: 0.8 },
  { id: "conch", label: "Conch", group: "Ear", kind: "ear", names: ["conch"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "ring", sideMode: "pair", scale: 0.9 },
  { id: "tragus", label: "Tragus", group: "Ear", kind: "ear", names: ["tragus"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "ring", sideMode: "pair", scale: 0.75 },
  { id: "rook", label: "Rook", group: "Ear", kind: "ear", names: ["rook"], shapes: ["curved", "barbell", "stud", "hoop"], defaultShape: "curved", hoopMode: "ring", sideMode: "pair", scale: 0.75 },
  { id: "daith", label: "Daith", group: "Ear", kind: "ear", names: ["daith"], shapes: ["hoop", "stud"], defaultShape: "hoop", hoopMode: "ring", sideMode: "pair", scale: 0.8 },
  { id: "industrial", label: "Industrial", group: "Ear", kind: "ear", names: ["industrial"], shapes: ["barbell"], defaultShape: "barbell", sideMode: "pair", scale: 0.75 },

  { id: "eyebrow", label: "Eyebrow", group: "Face & lip", kind: "brow", names: ["eyebrow", "eyebrows"], shapes: ["curved", "barbell"], defaultShape: "curved", sideMode: "pair", scale: 0.8 },
  { id: "septum", label: "Septum", group: "Face & lip", kind: "septum", names: ["septum"], shapes: ["horseshoe", "hoop"], defaultShape: "horseshoe", midline: true, sideMode: "none", scale: 1 },
  { id: "labret", label: "Labret", group: "Face & lip", kind: "lip", names: ["labret"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "hang", midline: true, sideMode: "none", scale: 0.9 },
  { id: "vertical-labret", label: "Vertical labret", group: "Face & lip", kind: "lip", names: ["vertical labret"], shapes: ["curved", "barbell"], defaultShape: "curved", midline: true, sideMode: "none", scale: 0.8 },
  { id: "snake-bites", label: "Snake bites", group: "Face & lip", kind: "lip", names: ["snake bites", "snake bite"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "ring", sideMode: "none", scale: 0.8 },
  { id: "spider-bites", label: "Spider bites", group: "Face & lip", kind: "lip", names: ["spider bites", "spider bite"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "ring", sideMode: "single", scale: 0.75 },
  { id: "dolphin-bites", label: "Dolphin bites", group: "Face & lip", kind: "lip", names: ["dolphin bites", "dolphin bite"], shapes: ["stud", "hoop"], defaultShape: "stud", hoopMode: "ring", midline: true, sideMode: "none", scale: 0.75 },
  { id: "tongue", label: "Tongue", group: "Face & lip", kind: "tongue", names: ["tongue"], shapes: ["stud"], defaultShape: "stud", midline: true, sideMode: "none", scale: 0.9, note: "Tongue previews need your mouth open wide so the camera can see the tongue." },

  { id: "navel", label: "Navel", group: "Body", kind: "navel", names: ["navel", "belly button"], shapes: ["stud", "hoop", "drop"], defaultShape: "stud", hoopMode: "hang", midline: true, sideMode: "none", scale: 0.4, note: "Navel previews are estimated from your shoulders and hips (body pose), so show your whole torso. Use the sliders to line it up; your piercer decides the exact spot." },
];

export const DEFAULT_PLACEMENT_ID = "lobe";

const byId = new Map(PLACEMENTS.map((p) => [p.id, p]));
const byName = new Map(PLACEMENTS.flatMap((p) => p.names.map((n) => [n, p])));

export const getPlacement = (id) => byId.get(id) ?? byId.get(DEFAULT_PLACEMENT_ID);
export const placementNote = (placement) => placement.note ?? (placement.kind === "ear" ? EAR_NOTE : "");

const clean = (value = "") => String(value).toLowerCase().replace(/\(\d+\)/g, "").replace(/\s+/g, " ").trim();

// Accepts a piercing_types name ("Upper lobe"), a portfolio sample title ("Snake Bites") or an id.
export function placementFromName(name) {
  const key = clean(name);
  return byName.get(key) ?? byId.get(key.replace(/\s+/g, "-")) ?? null;
}

export function groupedPlacements() {
  const groups = [];
  for (const placement of PLACEMENTS) {
    let group = groups.find((g) => g.label === placement.group);
    if (!group) groups.push((group = { label: placement.group, items: [] }));
    group.items.push(placement);
  }
  return groups;
}

/* ------------------------------ geometry ------------------------------ */

const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const add = (a, v) => ({ x: a.x + v.x, y: a.y + v.y });
const mul = (v, k) => ({ x: v.x * k, y: v.y * k });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v) => Math.hypot(v.x, v.y) || 1;
const unit = (v) => mul(v, 1 / len(v));
const dot = (a, b) => a.x * b.x + a.y * b.y;

// landmarks: MediaPipe list of {x, y} in 0..1 (already mirrored for a mirrored live view). W/H = canvas size.
export function makeFace(landmarks, W, H) {
  const P = (i) => ({ x: landmarks[i].x * W, y: landmarks[i].y * H });
  const xs = landmarks.map((p) => p.x);
  const ys = landmarks.map((p) => p.y);
  const fw = (Math.max(...xs) - Math.min(...xs)) * W;
  const fh = (Math.max(...ys) - Math.min(...ys)) * H;
  const [earL, earR] = [P(234), P(454)].sort((a, b) => a.x - b.x);
  const e = unit(sub(earR, earL)); // across the face, display-left to display-right (follows head tilt)
  let d = { x: -e.y, y: e.x }; // "down the face"
  if (d.y < 0) d = mul(d, -1);
  const browY = lerp(P(105), P(334), 0.5);
  const noseBase = P(2);
  return { P, fw, fh, earL, earR, e, d, browY, noseBase, centerX: (earL.x + earR.x) / 2 };
}

// Pose landmarks (MediaPipe Pose: 11/12 shoulders, 23/24 hips) -> the same fields buildPieces reads from a face.
// Returns null when the shoulders and hips are not all clearly in view.
export function makeBody(landmarks, W, H) {
  const needed = [11, 12, 23, 24].map((i) => landmarks?.[i]);
  const inView = needed.every(
    (p) => p && typeof p.visibility === "number" && p.visibility >= NAVEL_MIN_VISIBILITY && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1,
  );
  if (!inView) return null;
  const P = (i) => ({ x: landmarks[i].x * W, y: landmarks[i].y * H });
  const shoulderMid = lerp(P(11), P(12), 0.5);
  const hipMid = lerp(P(23), P(24), 0.5);
  const d = unit(sub(hipMid, shoulderMid)); // down the torso
  let e = { x: d.y, y: -d.x }; // across the body, display-left to display-right
  if (e.x < 0) e = mul(e, -1);
  return { P, fw: len(sub(P(11), P(12))), fh: len(sub(hipMid, shoulderMid)), e, d, shoulderMid, hipMid, centerX: shoulderMid.x };
}

// the two landmark groups of a symmetric pair, ordered display-left then display-right
function bySide(f, idxA, idxB) {
  return f.P(idxA[0]).x <= f.P(idxB[0]).x ? [idxA, idxB] : [idxB, idxA];
}

function earPoint(f, side, spec) {
  const anchor = side < 0 ? f.earL : f.earR;
  const span = dot(sub(f.noseBase, anchor), f.d) - dot(sub(f.browY, anchor), f.d);
  const top = dot(sub(f.browY, anchor), f.d);
  const along = top + spec.t * span;
  const out = mul(f.e, side * spec.ox * f.fw);
  return add(add(anchor, mul(f.d, along)), out);
}

function earMarks(f, placement, sides) {
  const spec = EAR[placement.id];
  const marks = [];
  for (const side of sides) {
    for (const m of spec.marks) {
      if (m.ends) {
        const ends = m.ends.map((end) => earPoint(f, side, end));
        marks.push({ center: m.t == null ? lerp(ends[0], ends[1], 0.5) : earPoint(f, side, m), ends, side });
      } else {
        marks.push({ center: earPoint(f, side, m), side });
      }
    }
  }
  return marks;
}

function browMarks(f, sides) {
  const right = [[70, 63, 105, 66, 107], [46, 53, 52, 65, 55]];
  const left = [[300, 293, 334, 296, 336], [276, 283, 282, 295, 285]];
  const [first, second] = bySide(f, right[0], left[0]);
  const lower = first === right[0] ? [right[1], left[1]] : [left[1], right[1]];
  const out = [];
  [[-1, first, lower[0]], [1, second, lower[1]]].forEach(([side, up, low]) => {
    if (!sides.includes(side)) return;
    // outer third of the brow: between landmark pairs 63/53 and 105/52
    const top = lerp(f.P(up[1]), f.P(up[2]), 0.4);
    const bottom = lerp(f.P(low[1]), f.P(low[2]), 0.4);
    const center = lerp(top, bottom, 0.5);
    // the balls sit just outside the brow, so stretch the bar a little past the brow edges
    out.push({ center, ends: [lerp(center, top, 1.8), lerp(center, bottom, 1.8)], side });
  });
  return out;
}

function lipMarks(f, placement, sides) {
  const thickness = len(sub(f.P(17), f.P(14)));
  const down = (p, k) => add(p, mul(f.d, k * thickness));
  const mirror = (idx) => f.P(idx);
  const leftIs91 = f.P(91).x <= f.P(321).x;
  const L = (a, b) => (leftIs91 ? a : b); // landmark on display-left
  const R = (a, b) => (leftIs91 ? b : a);
  const wide = (i, j, k) => lerp(mirror(i), mirror(j), k);

  switch (placement.id) {
    case "labret":
      return [{ center: down(f.P(18), 0.1) }];
    case "vertical-labret": {
      const top = down(f.P(17), -0.55);
      const bottom = down(f.P(18), 0.35);
      return [{ center: lerp(top, bottom, 0.5), ends: [top, bottom] }];
    }
    case "snake-bites":
      return [
        { center: down(wide(L(91, 321), L(181, 405), 0.6), -0.2), side: -1 },
        { center: down(wide(R(91, 321), R(181, 405), 0.6), -0.2), side: 1 },
      ];
    case "dolphin-bites":
      return [
        { center: down(mirror(L(84, 314)), 0.45), side: -1 },
        { center: down(mirror(R(84, 314)), 0.45), side: 1 },
      ];
    case "spider-bites": {
      const side = sides[0] ?? 1;
      const outer = side < 0 ? L(91, 321) : R(91, 321);
      const mid = side < 0 ? L(181, 405) : R(181, 405);
      const inner = side < 0 ? L(84, 314) : R(84, 314);
      return [
        { center: down(lerp(mirror(outer), mirror(mid), 0.55), -0.2), side },
        { center: down(lerp(mirror(mid), mirror(inner), 0.45), -0.2), side },
      ];
    }
    default:
      return [];
  }
}

function septumMarks(f, size) {
  const nose = len(sub(f.P(327), f.P(98))) || f.fw * 0.2;
  const r = nose * 0.36 * size;
  return [{ center: add(f.P(2), mul(f.d, r * 0.55)), ring: r }];
}

// mouth opening (as a fraction of face height) needed before a tongue piercing can be shown
const TONGUE_OPEN = 0.09;

function tongueMarks(f) {
  const upper = f.P(13);
  const lower = f.P(14);
  const open = len(sub(lower, upper));
  if (open < f.fh * TONGUE_OPEN) return { marks: [], hint: "Open your mouth wide to preview a tongue piercing." };
  return { marks: [{ center: lerp(upper, lower, 0.72) }], hint: "" };
}

function navelMarks(f) {
  return [{ center: lerp(f.shoulderMid, f.hipMid, NAVEL_TORSO_FRACTION) }];
}

// Returns { marks: [{ center, ends?, side?, ring? }], hint }. Slider offsets are applied afterwards.
export function buildMarks(placement, f, { side = "both", size = 1 } = {}) {
  let sides = [-1, 1];
  if (placement.sideMode === "pair") sides = side === "left" ? [-1] : side === "right" ? [1] : [-1, 1];
  if (placement.sideMode === "single") sides = [side === "left" ? -1 : 1];

  switch (placement.kind) {
    case "ear": return { marks: earMarks(f, placement, sides), hint: "" };
    case "brow": return { marks: browMarks(f, sides), hint: "" };
    case "lip": return { marks: lipMarks(f, placement, sides), hint: "" };
    case "septum": return { marks: septumMarks(f, Number(size)), hint: "" };
    case "tongue": return tongueMarks(f);
    case "navel": return { marks: navelMarks(f), hint: "" };
    default: return { marks: [], hint: placement.unsupported ?? "" };
  }
}

// Turns marks into draw instructions for the chosen jewelry shape, with the slider nudges applied.
export function buildPieces(placement, f, settings) {
  const { marks, hint } = buildMarks(placement, f, settings);
  const radius = Math.max(4, f.fw * 0.035 * Number(settings.size) * (placement.scale ?? 1));
  const shape = placement.shapes.includes(settings.style) ? settings.style : placement.defaultShape;
  const up = Number(settings.vertical) / 100 * f.fh; // + moves DOWN the face (matches the slider label order)
  const spread = Number(settings.spread) / 100 * f.fw;

  const nudge = (p, mark) => {
    const dir = placement.midline ? 0 : (mark.side ?? (p.x < f.centerX ? -1 : 1));
    return add(add(p, mul(f.d, up)), mul(f.e, dir * spread));
  };

  const pieces = marks.map((mark) => {
    const center = nudge(mark.center, mark);
    const ends = mark.ends?.map((p) => nudge(p, mark));
    if (mark.ring) return { kind: shape === "hoop" ? "ring" : "horseshoe", center, r: mark.ring };
    if ((shape === "barbell" || shape === "curved") && ends) return { kind: shape, ends, r: radius, bend: mark.side ?? 1 };
    if (shape === "barbell" || shape === "curved") return { kind: "stud", center, r: radius };
    if (shape === "hoop") return { kind: placement.hoopMode === "hang" ? "hang" : "ring", center, r: radius };
    if (shape === "drop") return { kind: "drop", center, r: radius };
    return { kind: "stud", center, r: radius };
  });
  return { pieces, hint };
}
