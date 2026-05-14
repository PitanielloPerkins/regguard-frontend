"""
Detect when a job-description brief flags federal FAST‑41 diligence (data-center class projects).

Triggers when the scope reads as a **data center** plus **>**100 MW capacity or **>**$500 M — see product spec / UI.
"""

from __future__ import annotations

import re


def detect_fast41_eligibility_from_job_description(job_description: str) -> bool:
    jd = job_description or ""
    t = jd.lower()
    if "data center" not in t and "datacenter" not in t:
        return False
    # Literal product triggers: '>100MW' / '>$500M' style comparisons
    if re.search(r">\s*100\s*mw\b", jd, re.I):
        return True
    if re.search(r">\s*\$?\s*500\s*m\b", jd, re.I):
        return True
    # Natural-language comparatives common in scopes
    if re.search(r"\b(?:over|greater\s+than|exceed(?:s|ing)?|more\s+than)\s+100\s*mw\b", jd, re.I):
        return True
    if re.search(
        r"\b(?:over|greater\s+than|exceed(?:s|ing)?|more\s+than)\s*\$?\s*500\s*(?:m\b|million\b)",
        jd,
        re.I,
    ):
        return True
    return False
