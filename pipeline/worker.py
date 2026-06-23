"""FocalDive Clips - Python queue worker (v2 MVP, Prompt 5).

This is the *Python-side* worker that turns one job into delivered clips:

    job = {"job_id", "email", "url"}  (optionally "organization_id", "clip_count")

    1. run the pipeline (ingest -> transcribe -> score -> extract -> reframe ->
       captions) via ``pipeline.run.run_pipeline(url, job_id, clip_count=3)``;
    2. upload the 3 ``*_final.mp4`` clips to Cloudflare R2 (S3 API) and mint
       signed download links;
    3. email the customer the 3 links + their scores/hooks via Resend.

It is deliberately runnable **offline today** with zero paid infrastructure:

    * When R2 is not configured (``settings.r2_configured`` is False) the clips
      stay in ``workspace/{job_id}/clips`` and we emit local ``/files``-style
      references instead of signed URLs.
    * When ``RESEND_API_KEY`` is unset we LOG the rendered email instead of
      sending it.

So ``MOCK_MODE=true python pipeline/worker.py`` runs a whole job end-to-end with
no keys, no network, no Redis.

PHASE 2 - PRODUCTION ENTRYPOINT (BullMQ / Redis consumer)
---------------------------------------------------------
At MVP we do NOT require Redis to run. The NestJS API already enqueues BullMQ
jobs onto Redis (``settings.redis_url``); in production this module attaches as a
BullMQ-compatible consumer and calls :func:`process_job` for each job. Sketch::

    # PHASE 2: turn this module into a long-lived BullMQ worker.
    #   pip install bullmq            # python BullMQ client
    #   from bullmq import Worker
    #   async def handler(job, token):
    #       return process_job(job.data)        # job.data = {job_id,email,url,...}
    #   Worker("clips", handler, {"connection": settings.redis_url})
    # The queue name ("clips") and payload shape must match the NestJS producer
    # (see CONTRACTS.md §1 "Queue payload"). Keep process_job() pure so the same
    # function backs both the BullMQ consumer and the manual __main__ test below.

Usage:
    python pipeline/worker.py --help
    MOCK_MODE=true python pipeline/worker.py --job-id demo-job-0001 \
        --email you@example.com --url "mock://fixture-podcast"
"""

from __future__ import annotations

import argparse
import json
import logging
import mimetypes
import os
from pathlib import Path
from typing import Any, Optional

try:  # package import (python -m pipeline.worker)
    from .config import get_settings
    from . import run as run_mod
except ImportError:  # script invocation: python pipeline/worker.py
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from config import get_settings  # type: ignore
    import run as run_mod  # type: ignore

logger = logging.getLogger("focaldive.worker")

# MVP scope (v2 roadmap Part 1): top 3 clips only.
DEFAULT_CLIP_COUNT = 3

# How long a delivered link should stay valid. The signed-URL TTL we mint here
# mirrors the bucket's lifecycle below.
SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days

# Tenant scope is required for R2 key namespacing (CONTRACTS.md §5). The MVP job
# payload {job_id,email,url} doesn't carry one, so we fall back to this single
# tenant. PHASE 2: the BullMQ payload includes organization_id - pass it through.
DEFAULT_ORG_ID = "org_mvp"


# ──────────────────────────────────────────────────────────────────────────
# R2 upload (lazy boto3; local fallback when not configured)
# ──────────────────────────────────────────────────────────────────────────
def _r2_key(organization_id: str, job_id: str, filename: str) -> str:
    """Build the canonical R2 object key for a clip (CONTRACTS.md §5)."""
    return f"{organization_id}/{job_id}/clips/{filename}"


def upload_clips_to_r2(
    rows: list[dict[str, Any]],
    job_id: str,
    organization_id: str,
) -> list[dict[str, Any]]:
    """Upload each clip's ``*_final.mp4`` to R2 and attach a signed URL.

    Returns a copy of ``rows`` with two added keys per row:
        ``link``      - a signed download URL (R2) or a local ``/files`` ref.
        ``delivered`` - True when an upload/ref was produced.

    When R2 is not configured we DON'T upload: clips stay in the workspace and we
    emit a ``/files``-style reference so the worker is fully testable offline.
    The NestJS API serves ``workspace/{job_id}/...`` under its ``/files`` route.
    """
    settings = get_settings()
    out: list[dict[str, Any]] = []

    if not settings.r2_configured:
        # ── Local fallback (no R2 creds) - testable today ──────────────────
        logger.info(
            "R2 not configured (r2_configured=False); leaving clips in workspace "
            "and emitting /files references."
        )
        for r in rows:
            final = Path(r["final_path"])
            # /files reference mirrors what the NestJS API exposes to the web app.
            ref = f"/files/{job_id}/clips/{final.name}"
            row = dict(r)
            row["link"] = ref
            row["delivered"] = final.exists()
            out.append(row)
        return out

    # ── Real R2 upload path ────────────────────────────────────────────────
    # Lazy-import the heavy/paid dep so the mock path stays import-free.
    import boto3  # type: ignore
    from botocore.config import Config as _BotoConfig  # type: ignore

    # PHASE 2 - R2 7-DAY AUTO-DELETE LIFECYCLE (production storage, fd_clips_v2.md
    # Part 2: "Cloudflare R2 free 10 GB, zero egress + 7-day auto-delete of
    # clips"). We do NOT manage retention here per-upload. Instead configure a
    # bucket lifecycle rule ONCE (Cloudflare dashboard or S3 PutBucketLifecycle)
    # so every object under each tenant's clips/ prefix expires after 7 days:
    #   {
    #     "Rules": [{
    #       "ID": "expire-clips-7d",
    #       "Filter": {"Prefix": ""},          # whole bucket; clips are ephemeral
    #       "Status": "Enabled",
    #       "Expiration": {"Days": 7}
    #     }]
    #   }
    # The SIGNED_URL_TTL_SECONDS above matches this window so links never outlive
    # the object they point to.
    client = boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=_BotoConfig(signature_version="s3v4"),
        region_name="auto",  # R2 ignores region but boto3 wants one.
    )

    for r in rows:
        final = Path(r["final_path"])
        row = dict(r)
        if not final.exists():
            logger.warning("clip %s missing on disk, skipping upload: %s", r["rank"], final)
            row["link"] = None
            row["delivered"] = False
            out.append(row)
            continue
        key = _r2_key(organization_id, job_id, final.name)
        content_type = mimetypes.guess_type(final.name)[0] or "video/mp4"
        client.upload_file(
            str(final),
            settings.r2_bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        # Mint a time-limited signed URL (CONTRACTS.md §5: the browser only ever
        # receives signed URLs, never raw keys).
        link = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.r2_bucket, "Key": key},
            ExpiresIn=SIGNED_URL_TTL_SECONDS,
        )
        logger.info("uploaded clip %s -> r2://%s/%s", r["rank"], settings.r2_bucket, key)
        row["link"] = link
        row["delivered"] = True
        out.append(row)

    return out


# ──────────────────────────────────────────────────────────────────────────
# Email delivery (lazy resend; log fallback when no key)
# ──────────────────────────────────────────────────────────────────────────
def _render_email_html(rows: list[dict[str, Any]], clip_count: int) -> str:
    """Render the clean HTML body listing the delivered clips + scores/hooks."""
    items = []
    for r in rows:
        link = r.get("link") or "#"
        score = r.get("score", "")
        hook = (r.get("hook") or r.get("title") or "").strip()
        title = (r.get("title") or "").strip()
        heading = title or f"Clip {r['rank']}"
        items.append(
            f"""
            <div style="margin:0 0 20px 0;padding:16px;border:1px solid #eee;border-radius:10px;">
              <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.05em;">
                Clip {r['rank']} &middot; Virality {score}/100
              </div>
              <div style="font-size:17px;font-weight:700;margin:6px 0;color:#111;">{heading}</div>
              <div style="font-size:14px;color:#444;margin:0 0 12px 0;">&ldquo;{hook}&rdquo;</div>
              <a href="{link}" style="display:inline-block;background:#FFE600;color:#111;
                 font-weight:700;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">
                 Download clip {r['rank']}
              </a>
            </div>
            """
        )
    body = "".join(items)
    return f"""\
<!doctype html>
<html>
  <body style="margin:0;background:#fafafa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <h1 style="font-size:22px;color:#111;margin:0 0 4px 0;">Your {clip_count} FocalDive clips are ready</h1>
      <p style="font-size:14px;color:#666;margin:0 0 24px 0;">
        We picked your best moments and made them vertical with captions. Links below
        are valid for 7 days.
      </p>
      {body}
      <p style="font-size:12px;color:#aaa;margin-top:24px;">Made with FocalDive Clips.</p>
    </div>
  </body>
</html>
"""


def send_clip_email(
    to_email: str,
    rows: list[dict[str, Any]],
    clip_count: int,
) -> dict[str, Any]:
    """Email the customer their finished clips, or LOG the email offline.

    Returns a small result dict: ``{"sent": bool, "to", "subject", "provider"}``.

    When ``RESEND_API_KEY`` is set we send a clean HTML email via Resend. When it
    is NOT set we LOG the full email content instead of sending - so the whole
    worker is testable offline with no email provider. COMMENTED so the prod path
    is obvious.
    """
    settings = get_settings()
    subject = f"Your {clip_count} FocalDive clips are ready"
    html = _render_email_html(rows, clip_count)

    if not settings.resend_api_key:
        # ── Offline fallback: log instead of send ─────────────────────────
        logger.info("RESEND_API_KEY not set - logging email instead of sending.")
        link_lines = "\n".join(
            f"    #{r['rank']} (score {r.get('score')}): {r.get('link')}" for r in rows
        )
        logger.info(
            "EMAIL (not sent)\n  To: %s\n  From: %s\n  Subject: %s\n  Links:\n%s",
            to_email,
            settings.email_from,
            subject,
            link_lines,
        )
        return {"sent": False, "to": to_email, "subject": subject, "provider": "log"}

    # ── Real send via Resend ──────────────────────────────────────────────
    # Lazy-import the paid dep so the mock path stays import-free.
    import resend  # type: ignore

    resend.api_key = settings.resend_api_key
    resend.Emails.send(
        {
            "from": settings.email_from,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }
    )
    logger.info("sent clip email to %s via Resend", to_email)
    return {"sent": True, "to": to_email, "subject": subject, "provider": "resend"}


# ──────────────────────────────────────────────────────────────────────────
# The job handler - what the BullMQ consumer (PHASE 2) calls per job.
# ──────────────────────────────────────────────────────────────────────────
def process_job(job: dict[str, Any]) -> dict[str, Any]:
    """Run one job end-to-end: pipeline -> R2 upload -> email.

    ``job`` is the MVP payload ``{"job_id", "email", "url"}`` (extra keys
    ``organization_id`` and ``clip_count`` are honored if present - see the
    BullMQ payload in CONTRACTS.md §1).

    Returns a result dict::

        {
          "job_id", "email", "clip_count",
          "clips": [{rank, score, hook, title, link, delivered, final_path}, ...],
          "email_result": {...},
          "delivered_count": int,
        }
    """
    job_id = job["job_id"]
    email = job["email"]
    url = job["url"]
    organization_id = job.get("organization_id") or DEFAULT_ORG_ID
    clip_count = int(job.get("clip_count") or DEFAULT_CLIP_COUNT)

    settings = get_settings()
    logger.info(
        "process_job start job_id=%s email=%s clip_count=%d mock=%s",
        job_id, email, clip_count, settings.mock_mode,
    )

    # 1) Run the whole pipeline. run_pipeline is resumable; it returns the
    #    summary whose `rows` carry rank/score/hook/title/final_path.
    summary = run_mod.run_pipeline(url, job_id, clip_count)
    rows = summary["rows"]

    # 2) Upload finals to R2 (or emit local /files refs when R2 isn't configured).
    delivered_rows = upload_clips_to_r2(rows, job_id, organization_id)

    # 3) Email the customer their links + scores/hooks (or log offline).
    email_result = send_clip_email(email, delivered_rows, clip_count)

    delivered_count = sum(1 for r in delivered_rows if r.get("delivered"))
    logger.info(
        "process_job done job_id=%s delivered=%d/%d email_sent=%s",
        job_id, delivered_count, len(delivered_rows), email_result["sent"],
    )

    return {
        "job_id": job_id,
        "email": email,
        "clip_count": clip_count,
        "clips": [
            {
                "rank": r["rank"],
                "score": r.get("score"),
                "hook": r.get("hook"),
                "title": r.get("title"),
                "link": r.get("link"),
                "delivered": r.get("delivered", False),
                "final_path": r.get("final_path"),
            }
            for r in delivered_rows
        ],
        "email_result": email_result,
        "delivered_count": delivered_count,
    }


def _main() -> None:
    parser = argparse.ArgumentParser(
        description="FocalDive Clips worker - run one job end-to-end "
        "(pipeline -> R2 upload -> email). Offline-friendly: with no keys it "
        "leaves clips in the workspace and logs the email."
    )
    parser.add_argument("--job-id", default="demo-job-0001", help="Job/workspace id")
    parser.add_argument("--email", default="customer@example.com", help="Customer email")
    parser.add_argument(
        "--url", default="mock://fixture-podcast", help="YouTube/remote URL or local file"
    )
    parser.add_argument(
        "--organization-id", default=None, help="Tenant id for R2 key namespacing (CONTRACTS §5)"
    )
    parser.add_argument(
        "--clips", type=int, default=DEFAULT_CLIP_COUNT, help="Number of clips (MVP default 3)"
    )
    parser.add_argument(
        "--mock", action="store_true", help="Force MOCK_MODE for this run (no GPU/APIs)"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    if args.mock:
        os.environ["MOCK_MODE"] = "true"
        get_settings.cache_clear()  # rebuild Settings with the forced flag

    job = {
        "job_id": args.job_id,
        "email": args.email,
        "url": args.url,
        "clip_count": args.clips,
    }
    if args.organization_id:
        job["organization_id"] = args.organization_id

    result = process_job(job)
    print("\n" + "=" * 70)
    print("WORKER RESULT")
    print("=" * 70)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    _main()
