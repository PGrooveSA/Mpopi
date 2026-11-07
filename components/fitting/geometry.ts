import * as THREE from "three";
import type { BodyType } from "@/lib/fit";

/** A horizontal cross-section: superellipse with separate front/back depth. */
export interface Ring {
  y: number;
  a: number; // half width (x)
  bf: number; // front depth (+z)
  bb: number; // back depth (-z)
  n?: number; // superellipse exponent (2 = ellipse, higher = boxier)
}

function sgnPow(v: number, p: number) {
  return Math.sign(v) * Math.pow(Math.abs(v), p);
}

/** Point on a ring at angle t (t = 0 → back, t = 0.5 → front, increasing to the viewer's right at the front). */
export function ringPoint(r: Ring, t: number) {
  const th = Math.PI + t * Math.PI * 2;
  const p = 2 / (r.n ?? 2);
  const s = Math.sin(th);
  const c = Math.cos(th);
  return { x: r.a * sgnPow(s, p), z: (c >= 0 ? r.bf : r.bb) * sgnPow(c, p) };
}

export function ringPerimeter(r: Ring, seg = 128) {
  let len = 0;
  let prev = ringPoint(r, 0);
  for (let i = 1; i <= seg; i++) {
    const p = ringPoint(r, i / seg);
    len += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  return len;
}

/**
 * Lofts a list of rings (bottom → top) into a smooth surface.
 * UVs: u = arc length around the ring (0 back, 0.5 front), v = height fraction.
 */
export function loft(
  rings: Ring[],
  opts: { seg?: number; capTop?: boolean; capBottom?: boolean; wobble?: (t: number, ring: Ring, k: number) => number } = {},
) {
  const seg = opts.seg ?? 96;
  const yMin = rings[0].y;
  const yMax = rings[rings.length - 1].y;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cols = seg + 1;

  rings.forEach((r, k) => {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const p = ringPoint(r, t);
      const w = opts.wobble ? opts.wobble(t, r, k) : 1;
      pts.push({ x: p.x * w, z: p.z * w });
    }
    let total = 0;
    const acc = [0];
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      acc.push(total);
    }
    pts.forEach((p, i) => {
      pos.push(p.x, r.y, p.z);
      uv.push(acc[i] / total, (r.y - yMin) / (yMax - yMin || 1));
    });
  });

  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < seg; i++) {
      const a = k * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }

  const cap = (k: number, up: boolean) => {
    const r = rings[k];
    const center = pos.length / 3;
    pos.push(0, r.y, 0);
    uv.push(0.5, up ? 1 : 0);
    for (let i = 0; i < seg; i++) {
      const a = k * cols + i;
      if (up) idx.push(a, a + 1, center);
      else idx.push(a + 1, a, center);
    }
  };
  if (opts.capTop) cap(rings.length - 1, true);
  if (opts.capBottom) cap(0, false);

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // smooth the seam (first and last column share a position)
  const n = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let k = 0; k < rings.length; k++) {
    const a = k * cols;
    const b = a + seg;
    const nx = n.getX(a) + n.getX(b);
    const ny = n.getY(a) + n.getY(b);
    const nz = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(nx, ny, nz) || 1;
    n.setXYZ(a, nx / l, ny / l, nz / l);
    n.setXYZ(b, nx / l, ny / l, nz / l);
  }
  n.needsUpdate = true;
  return g;
}

/** Circular tube along -Y from radii list [{y, r}] (y is local, top = 0). */
export function tube(profile: { y: number; r: number }[], opts: { capTop?: boolean; capBottom?: boolean; seg?: number } = {}) {
  const rings = [...profile].sort((p, q) => p.y - q.y).map((p) => ({ y: p.y, a: p.r, bf: p.r, bb: p.r, n: 2 }));
  return loft(rings, { seg: opts.seg ?? 40, capTop: opts.capTop, capBottom: opts.capBottom });
}

// ------------------------------------------------------------------ body model

/** Base torso profiles for a size-M body, 1.70 m tall (metres). Bottom → top. */
const TORSO: Record<BodyType, Ring[]> = {
  female: [
    { y: 0.8, a: 0.163, bf: 0.098, bb: 0.12, n: 2.2 },
    { y: 0.88, a: 0.178, bf: 0.104, bb: 0.126, n: 2.2 },
    { y: 0.96, a: 0.157, bf: 0.094, bb: 0.104, n: 2.2 },
    { y: 1.03, a: 0.128, bf: 0.084, bb: 0.088, n: 2.2 },
    { y: 1.1, a: 0.136, bf: 0.094, bb: 0.088, n: 2.2 },
    { y: 1.17, a: 0.148, bf: 0.124, bb: 0.089, n: 2.25 },
    { y: 1.225, a: 0.15, bf: 0.118, bb: 0.089, n: 2.3 },
    { y: 1.285, a: 0.15, bf: 0.094, bb: 0.085, n: 2.5 },
    { y: 1.335, a: 0.163, bf: 0.079, bb: 0.079, n: 2.9 },
    { y: 1.37, a: 0.15, bf: 0.068, bb: 0.07, n: 3.0 },
    { y: 1.398, a: 0.108, bf: 0.058, bb: 0.06, n: 2.6 },
    { y: 1.418, a: 0.056, bf: 0.05, bb: 0.05, n: 2 },
  ],
  male: [
    { y: 0.8, a: 0.158, bf: 0.098, bb: 0.11, n: 2.2 },
    { y: 0.88, a: 0.163, bf: 0.1, bb: 0.112, n: 2.2 },
    { y: 0.96, a: 0.154, bf: 0.095, bb: 0.1, n: 2.2 },
    { y: 1.04, a: 0.149, bf: 0.096, bb: 0.094, n: 2.25 },
    { y: 1.12, a: 0.157, bf: 0.106, bb: 0.095, n: 2.3 },
    { y: 1.2, a: 0.167, bf: 0.116, bb: 0.099, n: 2.4 },
    { y: 1.27, a: 0.175, bf: 0.11, bb: 0.095, n: 2.5 },
    { y: 1.33, a: 0.192, bf: 0.088, bb: 0.086, n: 3.0 },
    { y: 1.37, a: 0.178, bf: 0.075, bb: 0.076, n: 3.2 },
    { y: 1.41, a: 0.124, bf: 0.064, bb: 0.065, n: 2.6 },
    { y: 1.438, a: 0.064, bf: 0.055, bb: 0.055, n: 2 },
  ],
};

/** Ring index of the chest (widest point that a shirt hangs from). */
const CHEST_INDEX: Record<BodyType, number> = { female: 6, male: 6 };
const SHOULDER_INDEX: Record<BodyType, number> = { female: 8, male: 7 };

export interface BodyParams {
  type: BodyType;
  /** chest circumference of the body, cm */
  chest: number;
  /** height in cm */
  height: number;
}

export interface BodyModel {
  torso: Ring[];
  hs: number;
  wf: number;
  neckY: number;
  shoulderY: number;
  shoulderA: number;
  chestY: number;
  armRoot: THREE.Vector3;
  armAngle: number;
  upperArm: number;
  foreArm: number;
  armR: number;
  legX: number;
}

export function buildBody(p: BodyParams): BodyModel {
  const base = TORSO[p.type];
  const baseChest = p.type === "female" ? 92 : 96;
  const wf = p.chest / baseChest;
  const hs = p.height / 170;
  // waist and hips grow a little faster than the chest in bigger sizes
  const torso = base.map((r, i) => {
    const mid = i >= 1 && i <= 4 ? 1 + (wf - 1) * 0.25 : 1;
    const f = wf * mid;
    return { ...r, y: r.y * hs, a: r.a * f, bf: r.bf * f, bb: r.bb * f };
  });
  const sh = torso[SHOULDER_INDEX[p.type]];
  const neck = torso[torso.length - 1];
  return {
    torso,
    hs,
    wf,
    neckY: neck.y,
    shoulderY: sh.y,
    shoulderA: sh.a,
    chestY: torso[CHEST_INDEX[p.type]].y,
    armRoot: new THREE.Vector3(sh.a * 0.86, sh.y - 0.022 * hs, -0.004),
    armAngle: THREE.MathUtils.degToRad(p.type === "female" ? 13 : 12) + (wf - 1) * 0.22,
    upperArm: 0.29 * hs,
    foreArm: 0.255 * hs,
    armR: (p.type === "female" ? 0.047 : 0.054) * Math.pow(wf, 0.9),
    legX: 0.088 * wf,
  };
}

export interface ShirtParams {
  /** garment chest circumference, cm */
  chest: number;
  /** garment length from high point shoulder, cm */
  length: number;
  /** sleeve length from shoulder seam, cm */
  sleeve: number;
}

export interface ShirtModel {
  rings: Ring[];
  hemY: number;
  topY: number;
  looseness: number;
  scale: number;
  sleeveTop: number;
  sleeveEnd: number;
  sleeveLen: number;
  sleeveAngle: number;
  collar: Ring;
  chestRing: Ring;
}

/** Drapes a t-shirt around the body: eased by the size difference and hanging straight down from the chest. */
export function buildShirt(body: BodyModel, bodyChest: number, s: ShirtParams, type: BodyType): ShirtModel {
  const scale = s.chest / bodyChest;
  const ease = Math.max(-0.02, scale - 1);
  const looseness = THREE.MathUtils.clamp((scale - 1) / 0.35, 0, 1);
  const gap = 0.006;
  const top = body.torso.length - 1;
  const chestI = CHEST_INDEX[type];
  const hemY = body.neckY - s.length / 100;

  const fromTop: Ring[] = [];
  let prev: Ring | null = null;
  for (let i = top; i >= 0; i--) {
    const b = body.torso[i];
    // ease grows from the neck (little) to the chest (full)
    const w = i >= chestI ? THREE.MathUtils.lerp(1, 0.3, (i - chestI) / (top - chestI)) : 1;
    const e = 1 + Math.max(ease * w, -0.005);
    // a bit more clearance over the hips so the trousers never poke through
    const g2 = gap + (b.y < body.chestY - 0.2 * body.hs ? 0.007 : 0);
    let r: Ring = { y: b.y, a: b.a * e + g2, bf: b.bf * e + g2, bb: b.bb * e + g2, n: Math.min(b.n ?? 2, 2.6) };
    if (i === top) r = { ...r, a: b.a * 1.45 + gap, bf: b.bf * 1.3 + gap, bb: b.bb * 1.25 + gap };
    if (prev && i < chestI) {
      // fabric hangs: each ring keeps most of the width of the ring above it
      const hold = 0.988 - 0.01 * (1 - looseness);
      r.a = Math.max(r.a, prev.a * hold);
      r.bf = Math.max(r.bf, prev.bf * (hold - 0.006));
      r.bb = Math.max(r.bb, prev.bb * hold);
    }
    if (r.y < hemY) break;
    fromTop.push(r);
    prev = r;
  }
  // extend below the torso (over the hips/thighs) down to the hem
  let last = fromTop[fromTop.length - 1];
  const step = 0.045 * body.hs;
  while (last.y - step > hemY) {
    last = { ...last, y: last.y - step, a: last.a * 0.995, bf: last.bf * 0.99, bb: last.bb * 0.995 };
    fromTop.push(last);
  }
  fromTop.push({ ...last, y: hemY, a: last.a * 0.998, bf: last.bf * 0.995, bb: last.bb * 0.998 });

  // add intermediate rings for smoother shading
  const rings = fromTop.reverse();
  const smooth: Ring[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i];
    const b = rings[i + 1];
    smooth.push(a);
    const mid = (k: keyof Ring) => ((a[k] as number) + (b[k] as number)) / 2;
    smooth.push({ y: mid("y"), a: mid("a"), bf: mid("bf"), bb: mid("bb"), n: mid("n") });
  }
  smooth.push(rings[rings.length - 1]);

  const chestRing = smooth.reduce((best, r) => (Math.abs(r.y - body.chestY) < Math.abs(best.y - body.chestY) ? r : best), smooth[0]);
  const neck = body.torso[top];
  const sleeveOpening = Math.max(body.armR * 0.82 + 0.012, (s.chest / 100) * 0.34 / (Math.PI * 2));
  return {
    rings: smooth,
    hemY,
    topY: smooth[smooth.length - 1].y,
    looseness,
    scale,
    sleeveTop: Math.max(sleeveOpening * 1.18, body.armR * 1.35),
    sleeveEnd: sleeveOpening,
    sleeveLen: (s.sleeve / 100) * 0.95 + looseness * 0.05,
    sleeveAngle: body.armAngle + 0.05 + looseness * 0.1,
    collar: { y: neck.y, a: neck.a * 1.45 + gap, bf: neck.bf * 1.3 + gap, bb: neck.bb * 1.25 + gap, n: 2 },
    chestRing,
  };
}
