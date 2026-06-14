"""Celery worker entry point."""
from database.redis import celery_app
import workers.tasks  # noqa: F401 — ensure tasks are registered

__all__ = ["celery_app"]
