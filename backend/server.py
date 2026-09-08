"""ABHYUDAYA-CHATURBHUJ backend API.

Civic problem reporting + crowdsourcing + civic intelligence.
Modular services live in separate modules; this file wires up the HTTP routes.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

from ai_service import analyze_issue
from config import (APP_STORAGE_NAME, CATEGORIES, SEVERITIES, STATUSES, db)
from geo import haversine_km
from priority import compute_priority
from recurring_service import detect_recurring_problems, recurring_issue_ids
from security import (create_access_token, get_current_user, hash_password,
                      require_role, verify_password)
from seed import seed_demo_data
from storage_service import get_object, put_object

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("abhyudaya")

app = FastAPI(title="ABHYUDAYA-CHATURBHUJ API")

SCOPE_RADIUS_KM = {"nearby": 10, "city": 25, "state": 200}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    contributor_type: Optional[str] = "Citizen"


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = None  # optional client hint; backend is the authority


class AnalyzeIn(BaseModel):
    description: str = ""
    category: Optional[str] = None
    has_image: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class IssueIn(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=5, max_length=2000)
    category: str
    severity: str = "auto"  # "auto" => use system-assessed severity
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    image_url: Optional[str] = None


class StatusIn(BaseModel):
    status: str


class SuggestionIn(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=5, max_length=1500)
    approach: Optional[str] = None


class DonationIn(BaseModel):
    amount: float = Field(gt=0, le=1000000)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _enrich(issue: dict, user_id: str, recurring_ids: set[str]) -> dict:
    is_recurring = issue["id"] in recurring_ids
    prio = compute_priority(issue, is_recurring=is_recurring, funding_total=issue.get("funding_total", 0))
    issue = {**issue, **prio, "is_recurring": is_recurring}
    issue["has_upvoted"] = await db.upvotes.find_one({"issue_id": issue["id"], "user_id": user_id}) is not None
    return issue


async def _all_active_issues() -> list[dict]:
    return await db.issues.find({"deleted_at": None}, {"_id": 0}).to_list(2000)


@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.upvotes.create_index([("issue_id", 1), ("user_id", 1)], unique=True)
        await seed_demo_data()
        logger.info("Startup: indexes ensured and demo data seeded.")
    except Exception as e:
        logger.error(f"Startup seed error: {e}")
    try:
        await run_in_threadpool(_safe_init_storage)
    except Exception as e:
        logger.error(f"Storage init error: {e}")


def _safe_init_storage():
    from storage_service import init_storage
    try:
        init_storage()
    except Exception as e:
        logger.error(f"init_storage failed: {e}")


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------
@app.get("/api/")
async def root():
    return {"app": "ABHYUDAYA-CHATURBHUJ", "status": "ok"}


@app.get("/api/meta")
async def meta():
    return {"categories": CATEGORIES, "severities": SEVERITIES, "statuses": STATUSES}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@app.post("/api/auth/register", status_code=201)
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    ctype = body.contributor_type if body.contributor_type else "Citizen"
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": body.email.lower(),
        "role": "citizen",  # public signup is always a citizen
        "contributor_type": ctype,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None,
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["role"])
    return {"access_token": token, "user": _public_user(user)}


@app.post("/api/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if body.role and body.role != user["role"]:
        raise HTTPException(
            status_code=403,
            detail=f"This account is not a {body.role} account. Please choose the correct role.",
        )
    token = create_access_token(user["id"], user["role"])
    return {"access_token": token, "user": _public_user(user)}


@app.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return await _user_with_stats(user)


def _public_user(user: dict) -> dict:
    return {
        "id": user["id"], "name": user["name"], "email": user["email"],
        "role": user["role"], "contributor_type": user.get("contributor_type"),
    }


async def _user_with_stats(user: dict) -> dict:
    reports = await db.issues.count_documents({"user_id": user["id"], "deleted_at": None})
    resolved = await db.issues.count_documents({"user_id": user["id"], "status": "Resolved", "deleted_at": None})
    return {**_public_user(user), "reports_submitted": reports, "issues_resolved": resolved}


# ---------------------------------------------------------------------------
# Image upload / serve
# ---------------------------------------------------------------------------
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    data = await file.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 8 MB).")
    ext = (file.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "heic", "heif"):
        ext = "jpg"
    path = f"{APP_STORAGE_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    try:
        result = await run_in_threadpool(put_object, path, data, file.content_type)
    except Exception as e:
        logger.error(f"upload failed: {e}")
        raise HTTPException(status_code=502, detail="Image upload failed. Please try again.")
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}


@app.get("/api/files/{path:path}")
async def serve_image(path: str):
    try:
        content, content_type = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="Image not found.")
    return Response(content=content, media_type=content_type)


# ---------------------------------------------------------------------------
# System analysis
# ---------------------------------------------------------------------------
@app.post("/api/analyze")
async def analyze(body: AnalyzeIn, user: dict = Depends(get_current_user)):
    return analyze_issue(body.description, body.category, body.has_image, body.latitude, body.longitude)


# ---------------------------------------------------------------------------
# Issues
# ---------------------------------------------------------------------------
@app.post("/api/issues", status_code=201)
async def create_issue(body: IssueIn, user: dict = Depends(get_current_user)):
    if body.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category.")
    ai = analyze_issue(body.description, body.category, bool(body.image_url), body.latitude, body.longitude)
    severity = body.severity
    if severity == "auto" or severity not in SEVERITIES:
        severity = ai["ai_severity"]
    now = datetime.now(timezone.utc).isoformat()
    issue = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": body.title.strip(),
        "description": body.description.strip(),
        "category": body.category,
        "severity": severity,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "location_name": body.location_name or f"{round(body.latitude, 4)}, {round(body.longitude, 4)}",
        "image_url": body.image_url,
        "status": "Reported",
        "upvote_count": 0,
        "funding_total": 0,
        "funding_contributors": 0,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
        **ai,
    }
    issue.update(compute_priority(issue))
    await db.issues.insert_one(issue)
    return {**{k: v for k, v in issue.items() if k != "_id"}, "is_recurring": False, "has_upvoted": False}


@app.get("/api/issues")
async def list_issues(
    user: dict = Depends(get_current_user),
    category: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    scope: str = "all",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    mine: bool = False,
    sort: str = "recent",
):
    issues = await _all_active_issues()
    recurring = detect_recurring_problems(issues)
    rec_ids = recurring_issue_ids(recurring)

    filtered = []
    for it in issues:
        if mine and it["user_id"] != user["id"]:
            continue
        if category and it["category"] != category:
            continue
        if severity and it["severity"] != severity:
            continue
        if status and it["status"] != status:
            continue
        if q:
            hay = f"{it['title']} {it['description']} {it['location_name']}".lower()
            if q.lower() not in hay:
                continue
        if scope != "all" and lat is not None and lng is not None:
            radius = SCOPE_RADIUS_KM.get(scope, 25)
            dist = haversine_km(lat, lng, it["latitude"], it["longitude"])
            if dist > radius:
                continue
            it = {**it, "distance_km": round(dist, 1)}
        elif lat is not None and lng is not None:
            it = {**it, "distance_km": round(haversine_km(lat, lng, it["latitude"], it["longitude"]), 1)}
        filtered.append(it)

    enriched = [await _enrich(it, user["id"], rec_ids) for it in filtered]

    if sort == "priority":
        enriched.sort(key=lambda x: x["priority_score"], reverse=True)
    elif scope != "all" and lat is not None and lng is not None:
        enriched.sort(key=lambda x: x.get("distance_km", 9999))
    else:
        enriched.sort(key=lambda x: x["created_at"], reverse=True)

    return enriched


@app.get("/api/issues/{issue_id}")
async def get_issue(issue_id: str, user: dict = Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id, "deleted_at": None}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")
    issues = await _all_active_issues()
    rec_ids = recurring_issue_ids(detect_recurring_problems(issues))
    enriched = await _enrich(issue, user["id"], rec_ids)
    reporter = await db.users.find_one({"id": issue["user_id"]}, {"_id": 0, "name": 1, "contributor_type": 1})
    enriched["reporter_name"] = reporter["name"] if reporter else "Citizen"
    return enriched


@app.patch("/api/issues/{issue_id}/status")
async def update_status(issue_id: str, body: StatusIn, user: dict = Depends(require_role("government"))):
    if body.status not in STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status value.")
    issue = await db.issues.find_one({"id": issue_id, "deleted_at": None})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")
    await db.issues.update_one(
        {"id": issue_id},
        {"$set": {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"id": issue_id, "status": body.status}


@app.post("/api/issues/{issue_id}/upvote")
async def toggle_upvote(issue_id: str, user: dict = Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id, "deleted_at": None})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")
    existing = await db.upvotes.find_one({"issue_id": issue_id, "user_id": user["id"]})
    if existing:
        await db.upvotes.delete_one({"issue_id": issue_id, "user_id": user["id"]})
        new_count = max(0, issue.get("upvote_count", 0) - 1)
        has = False
    else:
        await db.upvotes.insert_one({
            "id": str(uuid.uuid4()), "issue_id": issue_id, "user_id": user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        new_count = issue.get("upvote_count", 0) + 1
        has = True
    await db.issues.update_one({"id": issue_id}, {"$set": {"upvote_count": new_count}})
    return {"upvote_count": new_count, "has_upvoted": has}


# ---------------------------------------------------------------------------
# Suggestions
# ---------------------------------------------------------------------------
@app.get("/api/issues/{issue_id}/suggestions")
async def list_suggestions(issue_id: str, user: dict = Depends(get_current_user)):
    items = await db.suggestions.find({"issue_id": issue_id, "deleted_at": None}, {"_id": 0}).to_list(500)
    items.sort(key=lambda s: (s.get("helpful_count", 0), s.get("created_at", "")), reverse=True)
    return items


@app.post("/api/issues/{issue_id}/suggestions", status_code=201)
async def add_suggestion(issue_id: str, body: SuggestionIn, user: dict = Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id, "deleted_at": None})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")
    doc = {
        "id": str(uuid.uuid4()),
        "issue_id": issue_id,
        "user_id": user["id"],
        "author_name": user["name"],
        "contributor_type": user.get("contributor_type") or "Citizen",
        "title": body.title.strip(),
        "description": body.description.strip(),
        "approach": body.approach,
        "helpful_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "deleted_at": None,
    }
    await db.suggestions.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@app.post("/api/suggestions/{suggestion_id}/useful")
async def mark_useful(suggestion_id: str, user: dict = Depends(require_role("government"))):
    s = await db.suggestions.find_one({"id": suggestion_id, "deleted_at": None})
    if not s:
        raise HTTPException(status_code=404, detail="Suggestion not found.")
    new_count = s.get("helpful_count", 0) + 1
    await db.suggestions.update_one({"id": suggestion_id}, {"$set": {"helpful_count": new_count}})
    return {"id": suggestion_id, "helpful_count": new_count}


# ---------------------------------------------------------------------------
# Donations (prototype only)
# ---------------------------------------------------------------------------
@app.get("/api/issues/{issue_id}/donations")
async def get_donations(issue_id: str, user: dict = Depends(get_current_user)):
    items = await db.donations.find({"issue_id": issue_id}, {"_id": 0}).to_list(1000)
    total = sum(d["amount"] for d in items)
    return {"total": total, "contributors": len(items), "donations": items}


@app.post("/api/issues/{issue_id}/donations", status_code=201)
async def add_donation(issue_id: str, body: DonationIn, user: dict = Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id, "deleted_at": None})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")
    doc = {
        "id": str(uuid.uuid4()),
        "issue_id": issue_id,
        "user_id": user["id"],
        "amount": round(body.amount, 2),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.donations.insert_one(doc)
    new_total = issue.get("funding_total", 0) + doc["amount"]
    new_contribs = issue.get("funding_contributors", 0) + 1
    await db.issues.update_one(
        {"id": issue_id},
        {"$set": {"funding_total": new_total, "funding_contributors": new_contribs}},
    )
    return {"amount": doc["amount"], "funding_total": new_total, "funding_contributors": new_contribs}


# ---------------------------------------------------------------------------
# Government analytics
# ---------------------------------------------------------------------------
@app.get("/api/stats")
async def gov_stats(user: dict = Depends(require_role("government"))):
    issues = await _all_active_issues()
    rec_ids = recurring_issue_ids(detect_recurring_problems(issues))
    total = len(issues)
    by_status = {s: 0 for s in STATUSES}
    high_critical = 0
    for it in issues:
        by_status[it["status"]] = by_status.get(it["status"], 0) + 1
        if it["severity"] in ("High", "Critical"):
            high_critical += 1

    enriched = []
    for it in issues:
        is_rec = it["id"] in rec_ids
        enriched.append({**it, **compute_priority(it, is_rec, it.get("funding_total", 0)), "is_recurring": is_rec})
    enriched.sort(key=lambda x: x["priority_score"], reverse=True)

    return {
        "total": total,
        "by_status": by_status,
        "high_critical": high_critical,
        "recurring_count": len(detect_recurring_problems(issues)),
        "priority_issues": enriched[:6],
    }


@app.get("/api/insights")
async def gov_insights(user: dict = Depends(require_role("government"))):
    issues = await _all_active_issues()
    by_category = {}
    by_severity = {s: 0 for s in SEVERITIES}
    by_status = {s: 0 for s in STATUSES}
    for it in issues:
        by_category[it["category"]] = by_category.get(it["category"], 0) + 1
        by_severity[it["severity"]] = by_severity.get(it["severity"], 0) + 1
        by_status[it["status"]] = by_status.get(it["status"], 0) + 1

    # trend: reports per week bucket over ~6 weeks
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    buckets = []
    for w in range(5, -1, -1):
        start = now - timedelta(days=(w + 1) * 7)
        end = now - timedelta(days=w * 7)
        count = 0
        for it in issues:
            try:
                dt = datetime.fromisoformat(it["created_at"])
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if start <= dt < end:
                    count += 1
            except Exception:
                pass
        buckets.append({"label": f"W{6 - w}", "count": count})

    return {
        "by_category": by_category,
        "by_severity": by_severity,
        "by_status": by_status,
        "trend": buckets,
        "recurring": detect_recurring_problems(issues),
    }


@app.get("/api/recurring")
async def recurring(user: dict = Depends(get_current_user)):
    issues = await _all_active_issues()
    return detect_recurring_problems(issues)


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
