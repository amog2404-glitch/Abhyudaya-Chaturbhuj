"""Recurring / clustered civic problem detection (Civic Intelligence).

Simple, explainable approach: group issues by category, then cluster them by
geographic proximity (<= radius km) within a time window (default 30 days).
A cluster with >= min_reports issues is a recurring problem.
"""
from collections import Counter
from datetime import datetime, timedelta, timezone

from geo import haversine_km

RADIUS_KM = 2.0
TIME_WINDOW_DAYS = 30
MIN_REPORTS = 3

RECURRING_ACTIONS = {
    "Pothole / Road Damage": "Consider a coordinated inspection and permanent resurfacing of this road section rather than treating each report individually.",
    "Garbage / Waste": "Review the waste collection schedule and consider a fixed collection point for this area to stop repeated accumulation.",
    "Broken Streetlight": "Audit the lighting circuit for this locality; repeated failures often indicate a common wiring or supply fault.",
    "Water Leakage": "Inspect the shared supply line for this area; recurring leaks suggest ageing pipeline that may need replacement.",
    "Drainage / Sewage": "Plan desilting of the connected drainage network for this zone to prevent repeated overflow.",
    "Traffic / Road Obstruction": "Review signage, enforcement and parking arrangements at this junction to address recurring obstruction.",
    "Pollution": "Investigate a possible common source of pollution in this area and issue coordinated corrective action.",
    "Damaged Public Infrastructure": "Conduct an area-wide structural safety audit; multiple reports may indicate systemic deterioration.",
    "Other": "Investigate the common cause behind these repeated reports and plan coordinated action.",
}


def _parse_dt(value: str) -> datetime:
    try:
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def detect_recurring_problems(issues: list[dict]) -> list[dict]:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=TIME_WINDOW_DAYS)
    results: list[dict] = []

    categories = {i["category"] for i in issues}
    for category in categories:
        items = [
            i for i in issues
            if i["category"] == category
            and i.get("latitude") is not None
            and _parse_dt(i.get("created_at", now.isoformat())) >= cutoff
        ]
        clusters: list[list[dict]] = []
        for it in items:
            placed = False
            for cluster in clusters:
                c_lat = sum(c["latitude"] for c in cluster) / len(cluster)
                c_lng = sum(c["longitude"] for c in cluster) / len(cluster)
                if haversine_km(c_lat, c_lng, it["latitude"], it["longitude"]) <= RADIUS_KM:
                    cluster.append(it)
                    placed = True
                    break
            if not placed:
                clusters.append([it])

        for cluster in clusters:
            if len(cluster) < MIN_REPORTS:
                continue
            c_lat = sum(c["latitude"] for c in cluster) / len(cluster)
            c_lng = sum(c["longitude"] for c in cluster) / len(cluster)
            names = [c.get("location_name") for c in cluster if c.get("location_name")]
            area_name = Counter(names).most_common(1)[0][0] if names else "Nearby area"
            results.append({
                "category": category,
                "area_name": area_name,
                "center_latitude": round(c_lat, 6),
                "center_longitude": round(c_lng, 6),
                "report_count": len(cluster),
                "time_window_days": TIME_WINDOW_DAYS,
                "radius_km": RADIUS_KM,
                "description": f"Recurring {category.lower()} reported {len(cluster)} times near {area_name} within the last {TIME_WINDOW_DAYS} days.",
                "suggested_action": RECURRING_ACTIONS.get(category, RECURRING_ACTIONS["Other"]),
                "issue_ids": [c["id"] for c in cluster],
            })

    results.sort(key=lambda r: r["report_count"], reverse=True)
    return results


def recurring_issue_ids(recurring: list[dict]) -> set[str]:
    ids: set[str] = set()
    for r in recurring:
        ids.update(r["issue_ids"])
    return ids
