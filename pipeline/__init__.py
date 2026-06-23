"""FocalDive Clips - Python AI pipeline package.

Each module is runnable standalone (``python pipeline/<module>.py``) and chainable
through :mod:`pipeline.run`. All GPU/paid code paths are guarded behind
``MOCK_MODE`` (see :mod:`pipeline.config`) so the whole pipeline runs offline with
deterministic mocks.
"""

__all__ = [
    "config",
    "ingest",
    "transcribe",
    "score_clips",
    "extract",
    "reframe",
    "captions",
    "run",
]
