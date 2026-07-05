"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";

/**
 * StarBorder (React Bits) - an animated "shooting star" glow that sweeps along
 * the top and bottom edges of its container, fading to transparent. Adapted to
 * this project's conventions: keyframes live in globals.css (star-movement-top /
 * star-movement-bottom) instead of a separate StarBorder.css import.
 *
 * Use it as a wrapper around any element (default <button>) to give it a lively
 * animated border, e.g. a primary CTA while a request is in flight.
 *
 *   <StarBorder as="div" color="#ac82f7" speed="5s" thickness={2}>…</StarBorder>
 */
export function StarBorder({
  as: Component = "button",
  className = "",
  color = "white",
  speed = "6s",
  thickness = 1,
  children,
  style,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  color?: string;
  speed?: string;
  thickness?: number;
  children?: ReactNode;
  style?: CSSProperties;
} & Record<string, unknown>) {
  return (
    <Component
      className={`star-border-container ${className}`}
      style={{ padding: `${thickness}px 0`, ...style }}
      {...rest}
    >
      <div
        className="border-gradient-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
        aria-hidden
      />
      <div
        className="border-gradient-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
        aria-hidden
      />
      <div className="star-inner-content">{children}</div>
    </Component>
  );
}

export default StarBorder;
