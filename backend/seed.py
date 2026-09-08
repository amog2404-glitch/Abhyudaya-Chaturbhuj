"""Seed demo users and civic issues so the app is never empty during judging."""
import uuid
from datetime import datetime, timedelta, timezone

from config import db
from security import hash_password

# Public unsplash images per category (persistent public URLs).
IMG = {
    "Pothole / Road Damage": "https://images.unsplash.com/photo-1560782202-154b39d57ef2?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
    "Garbage / Waste": "https://images.unsplash.com/photo-1762805545352-4ac5355b0f0b?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
    "Broken Streetlight": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
    "Water Leakage": "https://images.unsplash.com/photo-1585351737536-2f6b8f9f7f2e?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
    "Drainage / Sewage": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
    "Traffic / Road Obstruction": "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
    "Pollution": "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
    "Damaged Public Infrastructure": "https://images.unsplash.com/photo-1590274853856-f22d5ee3d228?crop=entropy&cs=srgb&fm=jpg&q=80&w=1000",
}


def _dt(days_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


async def seed_demo_data():
    # ---- Demo + extra citizen accounts (idempotent upsert) -----------------
    demo_users = [
        {"id": str(uuid.uuid4()), "name": "Demo Citizen", "email": "citizen@abhyudaya.in",
         "password": "citizen123", "role": "citizen", "contributor_type": "Citizen"},
        {"id": str(uuid.uuid4()), "name": "Gov Official", "email": "admin@abhyudaya.in",
         "password": "admin123", "role": "government", "contributor_type": None},
        {"id": str(uuid.uuid4()), "name": "Anita Rao", "email": "anita@abhyudaya.in",
         "password": "citizen123", "role": "citizen", "contributor_type": "Student"},
        {"id": str(uuid.uuid4()), "name": "Prof. Menon", "email": "menon@abhyudaya.in",
         "password": "citizen123", "role": "citizen", "contributor_type": "Faculty"},
    ]
    email_to_id = {}
    for u in demo_users:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            email_to_id[u["email"]] = existing["id"]
            continue
        doc = {
            "id": u["id"], "name": u["name"], "email": u["email"],
            "role": u["role"], "contributor_type": u["contributor_type"],
            "password_hash": hash_password(u["password"]),
            "created_at": _dt(60), "deleted_at": None,
        }
        await db.users.insert_one(doc)
        email_to_id[u["email"]] = u["id"]

    # ---- Only seed issues once ---------------------------------------------
    if await db.issues.count_documents({}) > 0:
        return

    citizen = email_to_id["citizen@abhyudaya.in"]
    anita = email_to_id["anita@abhyudaya.in"]
    menon = email_to_id["menon@abhyudaya.in"]

    P = "Pothole / Road Damage"
    G = "Garbage / Waste"
    SL = "Broken Streetlight"
    W = "Water Leakage"
    D = "Drainage / Sewage"
    T = "Traffic / Road Obstruction"
    PO = "Pollution"
    INF = "Damaged Public Infrastructure"

    seed = [
        # Bengaluru pothole cluster (recurring) ~ within 2km
        (P, "Large pothole near college gate", "There is a large pothole near the college gate and vehicles are swerving around it. It is dangerous during rush hour.", "High", "Reported", 12.9716, 77.5946, "MG Road, Bengaluru", citizen, 9, 2),
        (P, "Deep pothole on 4th cross", "Deep pothole formed after the rains, causing two-wheelers to lose balance.", "High", "Verified", 12.9750, 77.6000, "4th Cross, Bengaluru", anita, 6, 2),
        (P, "Road damage near bus stop", "The road surface is broken near the bus stop, water collects here.", "Medium", "In Progress", 12.9680, 77.5900, "Residency Road, Bengaluru", menon, 4, 6),
        (P, "Cracked road patch", "A cracked patch of asphalt is expanding on the main road.", "Medium", "Reported", 12.9800, 77.5980, "Brigade Road, Bengaluru", citizen, 3, 8),
        (P, "Pothole causing traffic slowdown", "Vehicles slow down sharply due to a pothole, minor jams every morning.", "High", "Reported", 12.9660, 77.6010, "Church Street, Bengaluru", anita, 5, 3),
        # Mumbai garbage cluster (recurring)
        (G, "Garbage accumulation at corner", "Garbage has been accumulating at the street corner for a week, foul smell.", "Medium", "Reported", 19.0760, 72.8777, "Andheri West, Mumbai", citizen, 7, 4),
        (G, "Overflowing dustbin", "The public dustbin is overflowing and waste is spilling onto the footpath.", "High", "Verified", 19.0800, 72.8820, "Andheri West, Mumbai", anita, 5, 5),
        (G, "Waste dumped near market", "Large pile of waste dumped near the market area, needs urgent pickup.", "High", "In Progress", 19.0720, 72.8740, "Andheri Market, Mumbai", menon, 8, 7),
        (G, "Litter around park", "Litter scattered around the park entrance, no bins nearby.", "Low", "Reported", 19.0790, 72.8700, "Versova, Mumbai", citizen, 2, 9),
        # Delhi mixed
        (SL, "Broken streetlight on main road", "Streetlight has not worked for two weeks, the stretch is very dark at night.", "Medium", "Reported", 28.6139, 77.2090, "Connaught Place, Delhi", anita, 4, 6),
        (W, "Water pipeline leakage", "A water pipeline is leaking continuously and water is being wasted.", "High", "Verified", 28.6200, 77.2000, "Karol Bagh, Delhi", citizen, 6, 3),
        (D, "Drain overflow after rain", "The drain overflows after every rain and sewage spreads onto the road.", "Critical", "In Progress", 28.6100, 77.2150, "Paharganj, Delhi", menon, 11, 10),
        # Chennai
        (T, "Traffic obstruction due to parking", "Illegal parking is causing a traffic obstruction near the junction.", "Medium", "Reported", 13.0827, 80.2707, "T Nagar, Chennai", anita, 3, 5),
        (PO, "Burning of waste causing smoke", "Open burning of waste is creating heavy smoke and air pollution.", "High", "Reported", 13.0900, 80.2800, "Anna Nagar, Chennai", citizen, 5, 12),
        # Bengaluru infra + resolved sample
        (INF, "Damaged footpath railing", "The footpath railing is broken and poses a safety risk to pedestrians.", "Medium", "Resolved", 12.9600, 77.5700, "Jayanagar, Bengaluru", menon, 4, 20),
        (SL, "Streetlight fixed - follow up", "Earlier reported dark stretch, requesting confirmation of repair.", "Low", "Resolved", 12.9770, 77.5920, "Indiranagar, Bengaluru", anita, 1, 25),
    ]

    from ai_service import analyze_issue
    from priority import compute_priority

    docs = []
    for (cat, title, desc, sev, status, lat, lng, loc, uid, upvotes, days) in seed:
        ai = analyze_issue(desc, cat, has_image=True, latitude=lat, longitude=lng)
        base = {
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "title": title,
            "description": desc,
            "category": cat,
            "severity": sev,
            "latitude": lat,
            "longitude": lng,
            "location_name": loc,
            "image_url": IMG.get(cat),
            "status": status,
            "upvote_count": upvotes,
            "funding_total": upvotes * 120,
            "funding_contributors": max(1, upvotes // 2),
            "created_at": _dt(days),
            "updated_at": _dt(days),
            "deleted_at": None,
            **ai,
        }
        base.update(compute_priority(base))
        docs.append(base)

    await db.issues.insert_many(docs)

    # seed a couple of suggestions + upvote records for the first issue
    first = docs[0]
    await db.suggestions.insert_many([
        {"id": str(uuid.uuid4()), "issue_id": first["id"], "user_id": menon,
         "author_name": "Prof. Menon", "contributor_type": "Faculty",
         "title": "Temporary cold-asphalt patch", "approach": "Pothole / Road Damage",
         "description": "Install warning signage immediately and perform temporary cold-asphalt patching while permanent resurfacing is scheduled.",
         "helpful_count": 4, "created_at": _dt(1), "deleted_at": None},
        {"id": str(uuid.uuid4()), "issue_id": first["id"], "user_id": anita,
         "author_name": "Anita Rao", "contributor_type": "Student",
         "title": "Temporary road marking", "approach": None,
         "description": "Add reflective road markings and a temporary barricade around the pothole to prevent accidents until repair.",
         "helpful_count": 2, "created_at": _dt(1), "deleted_at": None},
    ])
