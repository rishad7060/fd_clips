import Link from "next/link";
import Image from "next/image";

/**
 * Brand lockup - the real "Clips" wordmark (emblem + label) shipped in
 * /public/label-logo.svg. White-on-dark, sized to the surrounding nav line.
 */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center group" aria-label="ClipsHQ - home">
      <Image
        src="/label-logo.svg"
        alt="ClipsHQ"
        width={1762}
        height={533}
        priority
        className="h-7 w-auto transition group-hover:opacity-90"
      />
    </Link>
  );
}
