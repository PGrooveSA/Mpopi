"use client";
import { useId } from "react";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

export function isDark(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

/*
 * Regular-fit crew-neck tee, laid flat (proportions taken from a classic flat-lay:
 * body width : length ≈ 1 : 1.5, short sleeves angled down).
 * Body runs x 170 → 430 (260 units = half the chest), collar at y 54, hem at y 444.
 */
const BODY_SIDES =
  "M248 52 Q214 60 190 70 L104 190 Q130 214 160 226 L172 212 C175 300 174 380 172 444 Q300 452 428 444 C426 380 425 300 428 212 L440 226 Q470 214 496 190 L410 70 Q386 60 352 52";
const FRONT = `${BODY_SIDES} C340 90 260 90 248 52Z`;
const BACK = `${BODY_SIDES} C334 66 266 66 248 52Z`;

export interface TeeMockupProps {
  hex: string;
  print?: string;
  printBack?: string;
  printScale?: number;
  printOffsetY?: number;
  backPrintScale?: number;
  view?: "front" | "back";
  className?: string;
  shadow?: boolean;
  /** Draw the tee on a wooden hanger (studio rail look) */
  hanger?: boolean;
}

/** Photo-style flat t-shirt mockup drawn in SVG, with the product's print applied. */
export default function TeeMockup({
  hex,
  print,
  printBack,
  printScale = 0.75,
  printOffsetY = 0,
  backPrintScale = 0.85,
  view = "front",
  className,
  shadow = true,
  hanger = false,
}: TeeMockupProps) {
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${s}-${uid}`;
  const outline = view === "front" ? FRONT : BACK;
  const art = view === "front" ? print : printBack;
  const scale = view === "front" ? printScale : backPrintScale;
  const w = 260 * scale;
  const top = (view === "front" ? 126 : 112) + (view === "front" ? printOffsetY * 0.75 : 0);
  const dark = isDark(hex);
  const viewBox = hanger ? "50 -60 500 530" : "60 20 480 460";

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={`T-shirt mockup, ${view}`}>
      <defs>
        <clipPath id={id("clip")}>
          <path d={outline} />
        </clipPath>
        <linearGradient id={id("side")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={dark ? 0.4 : 0.14} />
          <stop offset="0.26" stopColor="#000" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity={dark ? 0.08 : 0.14} />
          <stop offset="0.74" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={dark ? 0.4 : 0.14} />
        </linearGradient>
        <linearGradient id={id("vert")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={dark ? 0.1 : 0.16} />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity={dark ? 0.25 : 0.08} />
        </linearGradient>
        <filter id={id("blur")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={id("fabric")}>
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.07 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {shadow && !hanger && <ellipse cx="300" cy="458" rx="150" ry="13" fill="#2a1c1a" opacity="0.16" filter={`url(#${id("soft")})`} />}
      {shadow && hanger && <path d={outline} transform="translate(10 16)" fill="#000" opacity="0.12" filter={`url(#${id("soft")})`} />}

      {hanger && (
        <g>
          <path d="M194 63 Q300 24 406 63" fill="none" stroke="#b07f55" strokeWidth="10" strokeLinecap="round" />
          <path d="M300 46 L300 22 C300 4 324 0 324 -20 C324 -40 300 -46 288 -34" fill="none" stroke="#6d6a66" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="300" cy="40" r="6" fill="#8d5f3c" />
        </g>
      )}

      <path d={outline} fill={hex} />
      {view === "front" && <path d="M248 52 C266 68 334 68 352 52 C340 90 260 90 248 52Z" fill={shade(hex, -0.3)} />}

      <g clipPath={`url(#${id("clip")})`}>
        {art && <image href={art} x={300 - w / 2} y={top} width={w} height={w * 1.4} preserveAspectRatio="xMidYMin meet" style={{ opacity: 0.97 }} />}
        <rect x="0" y="0" width="600" height="500" fill={`url(#${id("side")})`} />
        <rect x="0" y="0" width="600" height="500" fill={`url(#${id("vert")})`} />
        <rect x="0" y="0" width="600" height="500" filter={`url(#${id("fabric")})`} fill="#fff" />
        <g filter={`url(#${id("blur")})`} fill="none" strokeLinecap="round">
          <g stroke="#000" opacity={dark ? 0.3 : 0.07}>
            <path d="M176 220 Q204 236 216 262" strokeWidth="9" />
            <path d="M424 220 Q396 236 384 262" strokeWidth="9" />
            <path d="M126 168 Q146 190 150 214" strokeWidth="8" />
            <path d="M474 168 Q454 190 450 214" strokeWidth="8" />
            <path d="M206 330 Q236 372 226 436" strokeWidth="11" />
            <path d="M392 320 Q366 376 378 438" strokeWidth="11" />
          </g>
          <g stroke="#fff" opacity={dark ? 0.08 : 0.22}>
            <path d="M262 120 Q252 280 262 430" strokeWidth="20" />
            <path d="M348 130 Q358 280 346 428" strokeWidth="10" />
            <path d="M116 180 Q136 200 140 222" strokeWidth="6" />
          </g>
        </g>
        <g fill="none" stroke={shade(hex, dark ? 0.18 : -0.22)} strokeWidth="1.3" opacity="0.55">
          <path d="M190 70 Q170 140 172 212" />
          <path d="M410 70 Q430 140 428 212" />
          <path d="M174 432 Q300 440 426 432" strokeDasharray="5 4" />
          <path d="M112 180 Q136 202 164 214" strokeDasharray="5 4" />
          <path d="M488 180 Q464 202 436 214" strokeDasharray="5 4" />
        </g>
      </g>

      {view === "front" ? (
        <>
          <path d="M248 52 C260 90 340 90 352 52" fill="none" stroke={shade(hex, dark ? 0.06 : -0.06)} strokeWidth="11" />
          <path d="M255 59 C268 84 332 84 345 59" fill="none" stroke={shade(hex, dark ? 0.18 : -0.2)} strokeWidth="1.1" opacity="0.7" />
        </>
      ) : (
        <path d="M248 52 C266 66 334 66 352 52" fill="none" stroke={shade(hex, dark ? 0.06 : -0.06)} strokeWidth="9" />
      )}
      <path d={outline} fill="none" stroke="#000" strokeOpacity={dark ? 0.25 : 0.09} strokeWidth="1.4" />

    </svg>
  );
}
