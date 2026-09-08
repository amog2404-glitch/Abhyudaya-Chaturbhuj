"""Rule-based civic issue analysis.

Modular "System Analysis" service. Today it is a transparent rule-based engine
requiring no paid API. Set AI_PROVIDER=gemini (and wire a real model) later
without changing any caller: everyone calls analyze_issue().
"""
from typing import Optional

CATEGORY_KEYWORDS = {
    "Pothole / Road Damage": ["pothole", "road", "crater", "asphalt", "tarmac", "pavement", "speed breaker", "gate"],
    "Garbage / Waste": ["garbage", "trash", "waste", "dump", "litter", "rubbish", "dustbin", "landfill"],
    "Broken Streetlight": ["streetlight", "street light", "lamp", "light pole", "dark", "lighting", "bulb"],
    "Water Leakage": ["water leak", "pipeline", "pipe burst", "leakage", "water supply", "tap", "water pipe"],
    "Drainage / Sewage": ["drain", "sewage", "sewer", "gutter", "manhole", "clog", "overflow"],
    "Traffic / Road Obstruction": ["traffic", "signal", "obstruction", "jam", "encroach", "parking", "barricade"],
    "Pollution": ["pollution", "smoke", "air quality", "smell", "toxic", "burning", "fumes"],
    "Damaged Public Infrastructure": ["bridge", "wall", "footpath", "bench", "park", "building", "infrastructure", "railing"],
}

CRITICAL_WORDS = ["accident", "danger", "collapse", "burst", "critical", "fatal", "hazard", "sinkhole", "electrocution", "emergency", "injured"]
HIGH_WORDS = ["large", "deep", "major", "swerving", "overflow", "flood", "blocked", "broken", "severe", "huge", "unsafe"]
LOW_WORDS = ["minor", "small", "slight", "little", "tiny"]

SOLUTIONS = {
    "Pothole / Road Damage": "Inspect the road section and repair the damaged surface. Temporary barricading may be considered until permanent resurfacing is scheduled.",
    "Garbage / Waste": "Schedule waste collection for the location and assess whether an additional pickup point or bin is required to prevent recurrence.",
    "Broken Streetlight": "Dispatch the electrical maintenance team to inspect and replace the faulty fixture. Verify the wiring and power supply for the pole.",
    "Water Leakage": "Send the water works team to locate and seal the leak. Isolate the supply line if the leakage is significant to prevent water loss.",
    "Drainage / Sewage": "Clear the blocked drain and inspect the sewage line. Consider desilting the connected network to avoid repeated overflow.",
    "Traffic / Road Obstruction": "Coordinate with traffic authorities to clear the obstruction and, if recurring, review signage and enforcement in the area.",
    "Pollution": "Inspect the source of pollution and issue corrective notices. Monitor air/water quality in the affected zone.",
    "Damaged Public Infrastructure": "Carry out a structural safety inspection and schedule repair. Cordon off the area if it poses a safety risk.",
    "Other": "Route the report to the relevant municipal department for assessment and appropriate action.",
}

SUMMARIES = {
    "Pothole / Road Damage": "Road surface damage creating a potential traffic and safety hazard.",
    "Garbage / Waste": "Accumulation of waste affecting local hygiene and sanitation.",
    "Broken Streetlight": "Non-functional street lighting reducing night-time visibility and safety.",
    "Water Leakage": "Water leakage causing wastage and possible road/property damage.",
    "Drainage / Sewage": "Drainage or sewage issue that may lead to overflow and health concerns.",
    "Traffic / Road Obstruction": "Obstruction affecting the smooth flow of traffic in the area.",
    "Pollution": "Pollution concern impacting environmental quality and public health.",
    "Damaged Public Infrastructure": "Damaged public infrastructure that may pose a safety risk to citizens.",
    "Other": "Civic issue reported for review by the concerned department.",
}


def _detect_category(text: str, fallback: str) -> tuple[str, int]:
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        scores[category] = sum(1 for kw in keywords if kw in text)
    best = max(scores, key=scores.get)
    best_score = scores[best]
    if best_score == 0:
        return (fallback if fallback and fallback != "Other" else "Other"), 0
    return best, best_score


def _detect_severity(text: str, has_image: bool) -> str:
    if any(w in text for w in CRITICAL_WORDS):
        return "Critical"
    if any(w in text for w in HIGH_WORDS):
        return "High"
    if any(w in text for w in LOW_WORDS):
        return "Low"
    return "Medium"


def analyze_issue(
    description: str,
    selected_category: Optional[str] = None,
    has_image: bool = False,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> dict:
    text = (description or "").lower()
    detected_category, keyword_hits = _detect_category(text, selected_category or "Other")
    detected_severity = _detect_severity(text, has_image)

    confidence = 0.55
    if keyword_hits >= 1:
        confidence += 0.15
    if keyword_hits >= 2:
        confidence += 0.1
    if has_image:
        confidence += 0.1
    if latitude is not None and longitude is not None:
        confidence += 0.05
    confidence = round(min(confidence, 0.95), 2)

    return {
        "ai_category": detected_category,
        "ai_severity": detected_severity,
        "ai_summary": SUMMARIES.get(detected_category, SUMMARIES["Other"]),
        "ai_suggested_solution": SOLUTIONS.get(detected_category, SOLUTIONS["Other"]),
        "ai_confidence": confidence,
        "ai_provider": "rule-based",
    }
