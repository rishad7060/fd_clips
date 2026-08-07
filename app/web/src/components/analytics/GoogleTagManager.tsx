import Script from "next/script";

/**
 * Google Tag Manager loader.
 *
 * The container ID comes from NEXT_PUBLIC_GTM_ID (a build-time public env var).
 * When it's unset - local dev, or any build that doesn't want analytics - both
 * halves render nothing, so GTM never loads. This keeps dev/mock builds clean
 * and lets us ship the tag by only setting one env var in production.
 *
 * Strategy `afterInteractive` loads GTM *after* the page is interactive rather
 * than blocking first paint, so the Lighthouse Performance score is unaffected
 * (GTM is the single biggest offender when injected in <head> the classic way).
 * Next.js hoists this into <head> itself; we don't hand-inject the snippet.
 */
export function GoogleTagManager() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (!gtmId) return null;

  return (
    <Script id="gtm-base" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
    </Script>
  );
}

/**
 * The GTM <noscript> fallback. Must render immediately after the opening <body>
 * tag so it's present for no-JS crawlers/agents. Renders nothing when the
 * container ID is unset. Kept separate from the base loader so each can sit in
 * its required position (loader in <head> via next/script, this in <body>).
 */
export function GoogleTagManagerNoScript() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
