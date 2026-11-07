/** Fixed studio backdrop: warm off-white, soft brand glows and fine grain. */
export default function Background() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-cream">
      <div className="absolute -top-[20vh] -left-[15vw] h-[60vh] w-[60vh] rounded-full bg-blush/30 blur-[110px] animate-blob" />
      <div className="absolute top-[30vh] -right-[18vw] h-[55vh] w-[55vh] rounded-full bg-sky/30 blur-[120px] animate-blob" style={{ animationDelay: "-9s" }} />
      <svg className="absolute inset-0 h-full w-full opacity-[0.14] mix-blend-multiply">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0.12  0 0 0 0 0.1  0 0 0 0 0.1  0 0 0 0.5 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}
