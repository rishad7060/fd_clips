import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-cyan-400 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none">
          <path
            d="M5 4v16l14-8z"
            fill="currentColor"
            className="drop-shadow"
          />
        </svg>
      </span>
      <span className="text-[15px] font-bold tracking-tight text-white">
        FocalDive<span className="text-brand-400"> Clips</span>
      </span>
    </Link>
  );
}
