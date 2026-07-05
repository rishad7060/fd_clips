import { ImageResponse } from "next/og";

/**
 * Shared 1200x630 OpenGraph image generator for the free-tool + marketing pages.
 * Rendered at REQUEST time (the routes that use it export `dynamic = 'force-dynamic'`)
 * so it never hits Next's static-export path, which throws "Invalid URL" inside
 * @vercel/og during prerender. On first request the image renders and is then
 * CDN/browser-cached, so there is no per-request cost in practice.
 *
 * Inline styles only (ImageResponse supports a CSS subset); brand ink/purple palette.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export function renderOgImage({
  title,
  subtitle,
  eyebrow = "Free tool",
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          // Satori (next/og engine) only supports a small CSS subset - a simple
          // two-stop linear-gradient renders reliably; complex positioned
          // radial-gradients throw a parse error ("Invalid URL").
          backgroundColor: "#070a12",
          backgroundImage: "linear-gradient(135deg, #0b0f1a 0%, #14092b 55%, #070a12 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand glow accent (a positioned soft disc - a plain radial the engine accepts). */}
        <div
          style={{
            position: "absolute",
            top: "-160px",
            right: "-120px",
            width: "620px",
            height: "620px",
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(144,91,244,0.45), rgba(144,91,244,0))",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #ac82f7, #7a44e6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "34px",
              fontWeight: 800,
            }}
          >
            C
          </div>
          <div style={{ fontSize: "34px", fontWeight: 700, letterSpacing: "-0.02em" }}>Clips</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "24px",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: "#c3a8fa",
              fontWeight: 600,
              marginBottom: "24px",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "980px",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ marginTop: "28px", fontSize: "32px", color: "#9aa3bd", maxWidth: "900px" }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "26px", color: "#727d9c" }}>
          <span>clipshq.pro</span>
          <span style={{ color: "#3a4561" }}>•</span>
          <span>No sign-up · no API key · free</span>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
