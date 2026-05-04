"""
Compatibility shim — photo audit lives exclusively in ``vision_agent`` (Gemini).

Older imports of ``normalize_vision_text`` from ``vision`` remain valid.
"""

from vision_agent import normalize_vision_text

__all__ = ["normalize_vision_text"]
