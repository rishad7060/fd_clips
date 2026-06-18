"""Tiny per-clip parallelism helper shared by reframe/captions.

Each clip in a job is independent (its own raw→vertical→final encodes + sidecar
JSON), so the per-clip work parallelizes cleanly. The heavy cost is ffmpeg
(subprocess-bound) and MediaPipe (releases the GIL during inference), so a
THREAD pool gives real wall-clock overlap on CPU without the pickling/import
overhead a process pool would add for these subprocess-driven tasks.

The helper preserves INPUT ORDER in the returned list (results indexed by the
clip's position), prints stay readable, and an exception in one clip is re-raised
after the batch so failures surface (matching the prior fail-loud sequential
behavior) instead of silently dropping a clip.
"""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar

T = TypeVar("T")

# Cap the pool so we don't oversubscribe a small CPU; 4 concurrent ffmpeg/MediaPipe
# workers saturate a typical 4-8 core dev/worker box without thrashing.
MAX_CLIP_WORKERS = 4


def _worker_count(n_items: int) -> int:
    """Resolve the worker count: min(MAX_CLIP_WORKERS, cpu_count, n_items), ≥1."""
    cpu = os.cpu_count() or 1
    return max(1, min(MAX_CLIP_WORKERS, cpu, max(1, n_items)))


def map_clips_parallel(
    fn: Callable[..., T], items: list[tuple],
) -> list[T]:
    """Run ``fn(*item)`` for each tuple in ``items`` concurrently, in input order.

    ``items`` is a list of argument tuples (e.g. ``[(rank, cand), ...]``). Results
    come back in the SAME order as ``items`` regardless of completion order. With a
    single item (or one worker) it runs inline so the simple/serial path has no
    thread overhead. Any worker exception propagates after all submitted work is
    collected, so the batch fails loudly like the old sequential loop.
    """
    if not items:
        return []
    workers = _worker_count(len(items))
    if workers == 1 or len(items) == 1:
        return [fn(*it) for it in items]

    results: list[T] = [None] * len(items)  # type: ignore[list-item]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fn, *it): i for i, it in enumerate(items)}
        errors: list[BaseException] = []
        for fut in futures:
            pass  # ensure all submitted before gathering
        for fut, i in futures.items():
            try:
                results[i] = fut.result()
            except BaseException as exc:  # collect; re-raise the first below
                errors.append(exc)
    if errors:
        raise errors[0]
    return results
