import Link from "next/link";
import Background from "@/components/Background";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <Background />
      <div className="glass-strong max-w-md rounded-[2.5rem] p-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/bear.png" alt="" className="mx-auto h-28 w-auto animate-float" />
        <h1 className="font-display mt-4 text-3xl font-bold">Oops, lost bear</h1>
        <p className="mt-2 text-ink-soft">We couldn&apos;t find that page.</p>
        <Link href="/" className="btn-primary mt-6">
          Back home
        </Link>
      </div>
    </div>
  );
}
