/**
 * Reliable file download that works CROSS-ORIGIN.
 *
 * Clips are served from the API origin (e.g. http://localhost:4000/files/...)
 * while the app runs on the web origin (http://localhost:3000). The HTML
 * `<a download>` attribute is IGNORED for cross-origin URLs, so a plain anchor
 * just navigates to the mp4 and Chrome PLAYS it instead of saving it.
 *
 * Two layers make the save reliable:
 *  1. Append `?download=1&filename=<name>` so the API sends
 *     `Content-Disposition: attachment` (forces a download regardless of origin).
 *  2. Prefer fetching the bytes into a Blob and saving via an object URL — this
 *     is the most robust path (no navigation, correct filename) and also lets us
 *     download several files in a row. If the fetch fails (network/CORS), fall
 *     back to opening the attachment URL, which the header still forces to save.
 */

/** Add the download-forcing query params to a clip file URL. */
export function toDownloadUrl(fileUrl: string, filename: string): string {
  try {
    const u = new URL(fileUrl, typeof window !== "undefined" ? window.location.href : undefined);
    u.searchParams.set("download", "1");
    if (filename) u.searchParams.set("filename", filename);
    return u.toString();
  } catch {
    // Not a parseable URL — best effort append.
    const sep = fileUrl.includes("?") ? "&" : "?";
    return `${fileUrl}${sep}download=1&filename=${encodeURIComponent(filename)}`;
  }
}

/** Sanitize a suggested title into a safe .mp4 filename. */
export function clipFileName(suggestedTitle: string | undefined | null, rank: number): string {
  const base = (suggestedTitle?.trim().replace(/\s+/g, "_").replace(/[^\w-]+/g, "") || `clip_${rank}`).slice(0, 80);
  return `${base || `clip_${rank}`}.mp4`;
}

/**
 * Download one file to disk. Tries a blob fetch first (most reliable), falls
 * back to an attachment-URL anchor. Never throws to the caller.
 */
export async function downloadFile(fileUrl: string, filename: string): Promise<void> {
  const dlUrl = toDownloadUrl(fileUrl, filename);
  try {
    const res = await fetch(dlUrl, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke after a tick so the download can start.
    setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
  } catch {
    // Fallback: the attachment header still forces a save even without the blob.
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
