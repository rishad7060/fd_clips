import Link from "next/link";
import Image from "next/image";

/**
 * Brand lockup - the real "Clips" wordmark (emblem + label) shipped in
 * /public/label-logo.svg. White-on-dark, sized to the surrounding nav line.
 */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center group" aria-label="ClipsHQ - home">
      {/* SVG served as-is (unoptimized): routing a vector logo through the
          /_next/image optimizer gains nothing and, with dangerouslyAllowSVG's
          sandbox CSP, can fail to render (broken-image icon) on the standalone
          Docker server. unoptimized serves the raw /public SVG directly. */}
      <Image
        src="/label-logo.svg"
        alt="ClipsHQ"
        width={1762}
        height={533}
        priority
        unoptimized
        className="h-7 w-auto transition group-hover:opacity-90"
      />
    </Link>
  );
}
