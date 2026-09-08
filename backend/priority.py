"""Transparent priority scoring for issues.

Priority = severity weight + community support (upvotes) + recurring factor +
age factor + community interest (funding). Simple and explainable, not "AI".
"""
from datetime import datetime, timezone

from config import SEVERITY_WEIGHT


def _age_days(created_at: str) -> float:
    try:
        dt = datetime.fromisoformat(created_at)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - dt).total_seconds() / 86400.0
    except Exception:
        return 0.0


def compute_priority(issue: dict, is_recurring: bool = False, funding_total: float = 0.0) -> dict:
    severity_component = SEVERITY_WEIGHT.get(issue.get("severity", "Medium"), 2) * 10
    support_component = min(issue.get("upvote_count", 0), 20) * 2
    recurring_component = 15 if is_recurring else 0
    age_component = min(_age_days(issue.get("created_at", "")), 30) * 0.5
    funding_component = min(funding_total / 500.0, 10)

    score = severity_component + support_component + recurring_component + age_component + funding_component
    score = round(score, 1)

    if score >= 55 or issue.get("severity") == "Critical":
        label = "Critical"
    elif score >= 40:
        label = "High Priority"
    elif score >= 25:
        label = "Medium Priority"
    else:
        label = "Low Priority"

    return {
        "priority_score": score,
        "priority_label": label,
        "strong_community_interest": support_component + funding_component >= 12,
    }
