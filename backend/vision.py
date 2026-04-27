"""
Reg Guard — Claude vision analysis for job-site photos (trade / equipment context).
"""
import base64
import os
import re
from pathlib import Path
from typing import Optional

from anthropic import Anthropic
from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")

# Default: Claude 3.5 Sonnet (vision + text), resolved via Anthropic’s `-latest` alias.
# Override with ANTHROPIC_VISION_MODEL if you need a pinned snapshot.
def _vision_model() -> str:
    return (os.environ.get("ANTHROPIC_VISION_MODEL") or "claude-3-5-sonnet-latest").strip()

_VISION_INSTRUCTION = (
    "You are helping a U.S. building-code and permit research tool for licensed contractors. "
    "This is a job-site or equipment photo. "
    "List concise observations: equipment or systems visible, building elements, likely trades, "
    "materials, and anything that would narrow permit or code research. "
    "Output 3–6 short bullet lines starting with '•', neutral factual tone, no legal advice, "
    "no PII, no compliance verdicts—only what you see."
)


def _anthropic() -> Optional[Anthropic]:
    key = (os.environ.get("ANTHROPIC_API_KEY") or "").strip()
    if not key:
        return None
    return Anthropic(api_key=key)


def _normalize_media_type(content_type: Optional[str], filename: Optional[str]) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in ("image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"):
        if ct == "image/jpg":
            return "image/jpeg"
        return ct
    name = (filename or "").lower()
    if name.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if name.endswith(".png"):
        return "image/png"
    if name.endswith(".gif"):
        return "image/gif"
    if name.endswith(".webp"):
        return "image/webp"
    return "image/jpeg"


def analyze_job_site_image(image_bytes: bytes, content_type: Optional[str], filename: Optional[str] = None) -> str:
    """
    Return a text summary of the photo (equipment, site context) using Claude vision
    (default model: claude-3-5-sonnet-latest via the Anthropic Messages API).
    """
    if not image_bytes:
        raise ValueError("Empty image data.")
    if len(image_bytes) > 12 * 1024 * 1024:
        raise ValueError("Image too large; max 12MB.")

    client = _anthropic()
    if client is None:
        raise ValueError("ANTHROPIC_API_KEY is not set. Required for image analysis.")

    media_type = _normalize_media_type(content_type, filename)
    b64 = base64.standard_b64encode(image_bytes).decode("ascii")
    try:
        msg = client.messages.create(
            model=_vision_model(),
            max_tokens=800,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": _VISION_INSTRUCTION},
                    ],
                }
            ],
        )
    except Exception as err:
        raise ValueError(
            f"Claude vision request failed: {err!s}" if str(err) else "Claude vision request failed"
        ) from err

    parts: list[str] = []
    for block in msg.content or []:
        t = getattr(block, "type", None) or (block.get("type") if isinstance(block, dict) else None)
        if t == "text":
            tx = getattr(block, "text", None) or (block.get("text") if isinstance(block, dict) else None)
            if tx:
                parts.append(str(tx).strip())
    out = "\n".join(p for p in parts if p)
    out = re.sub(r"[\n\r]{2,}", "\n", out).strip()
    if not out:
        return "• (No text returned from vision model; try a clearer photo.)"
    return out
