import json
import random
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

# Attempt to import faiss for performance, but fall back gracefully
try:
    import faiss
    HAS_FAISS = True
except Exception:
    HAS_FAISS = False

# --- Constants and Config ---
DATA_PATHS = [ Path("frontend/public/products.json"), Path("data/products.json") ]
WEIGHTS = {"like": 1.0, "soft_like": 0.6, "super_like": 3.0, "dislike": -1.0}
RETRIEVE_K = 300
MMR_LAMBDA = 0.7  # 0.5 = more diversity, 1.0 = more relevance

# ===================== 1. Load Products & Data Structures ============================
def load_products():
    for p in DATA_PATHS:
        if p.exists():
            try:
                return json.loads(p.read_text(encoding="utf8"))
            except Exception:
                pass
    raise FileNotFoundError("Could not find frontend/public/products.json. Please run the build_products.py script.")

PRODUCTS = [p for p in load_products() if p.get("name") and p.get("url")]
N = len(PRODUCTS)

def get_pid(item: Dict[str, Any]) -> str:
    # Use a stable identifier if present, otherwise generate a synthetic one
    for k in ("id", "pid", "_id", "__pid"):
        if k in item and item[k]:
            return str(item[k])
    return str(abs(hash(json.dumps(item, sort_keys=True))))

# Create lookup tables for fast access
PID_TO_IDX: Dict[str, int] = {}
IDX_TO_PID: List[str] = []
URL_TO_IDX: Dict[str, int] = {}
for i, it in enumerate(PRODUCTS):
    pid = get_pid(it)
    PRODUCTS[i]["__pid"] = pid  # Ensure a canonical pid is attached
    PID_TO_IDX[pid] = i
    IDX_TO_PID.append(pid)
    if it.get("url"):
        URL_TO_IDX[it["url"]] = i

# ================ 2. Create Embeddings (Vector Representations) ===================
TEXTS = [" ".join([
    str(p.get("name") or ""), str(p.get("brand") or ""),
    str(p.get("color") or ""), str(p.get("type") or p.get("category") or "")
]) for p in PRODUCTS]

vectorizer = TfidfVectorizer(max_features=1024, stop_words="english")
X = vectorizer.fit_transform(TEXTS).toarray().astype("float32")
D = X.shape[1]

# Normalize vectors for cosine similarity calculations
norms = np.linalg.norm(X, axis=1, keepdims=True)
norms[norms == 0] = 1.0
X = X / norms

# Build Faiss index for fast similarity search if available
if HAS_FAISS:
    index = faiss.IndexFlatIP(D)  # IP (Inner Product) on normalized vectors is cosine similarity
    index.add(X)
else:
    index = None

# ==================== 3. User State Management ====================
USERS: Dict[str, Dict[str, Any]] = {}
USERS_LOCK = threading.Lock()

def ensure_user(uid: str):
    with USERS_LOCK:
        if uid not in USERS:
            USERS[uid] = {
                "seen": set(),
                "session_vec": None,
                "super_queue": [],
                "events": [],
                "attr_prefs": {"type": {}, "color": {}, "brand": {}},
                "calibration_vec": None,          # explicit session calibration vector
                "outfit_suggestions": [],         # queue for outfit suggestions
            }
    return USERS[uid]

# Pairing rules
PAIRING_RULES = {
    "top": ["pants", "skirt", "shorts"],
    "jacket": ["pants", "jeans", "dress"],
    "sweater": ["pants", "skirt", "jeans"],
    "pants": ["top", "shoes", "sweater"],
    "jeans": ["top", "shoes", "jacket"],
    "dress": ["shoes", "bag", "accessory"],
    "shoes": ["dress", "pants", "jeans"],
}

# Find complementary item
def find_complementary_item(original_idx: int, user_profile: Dict[str, Any]):
    if original_idx < 0 or original_idx >= N:
        return None
    original_item = PRODUCTS[original_idx]
    original_type = (original_item.get("type") or "").lower().strip()

    if original_type not in PAIRING_RULES:
        return None
    target_types = PAIRING_RULES[original_type]

    # collect candidates (idx, product)
    candidates = []
    seen_set = user_profile.get("seen", set())
    for i, p in enumerate(PRODUCTS):
        p_type = (p.get("type") or "").lower().strip()
        if p_type in target_types and get_pid(p) not in seen_set and i != original_idx:
            candidates.append((i, p))

    if not candidates:
        return None

    # score candidates
    best_match = None
    best_score = -1.0
    for cand_idx, candidate in candidates:
        score = 0.0
        # same brand bonus
        if (candidate.get("brand") or "") == (original_item.get("brand") or ""):
            score += 0.5
        # embedding similarity (X is normalized)
        try:
            similarity = float(np.dot(X[original_idx], X[cand_idx]))
        except Exception:
            similarity = 0.0
        score += similarity * 1.5

        if score > best_score:
            best_score = score
            best_match = candidate

    # return a shallow copy to avoid accidental mutation of the catalog
    return dict(best_match) if best_match is not None else None

# ===================== 4. Core Algorithm Functions =======================

class Feedback(BaseModel):
    user: str
    pid: str
    like: int = 0
    dwell_ms: int = 0
    soft_like: bool = False
    super_like: bool = False
    saved: bool = False   # ✅ NEW FIELD

def apply_feedback(fb: Feedback):
    u = ensure_user(fb.user)
    idx = PID_TO_IDX.get(fb.pid)
    if idx is None:
        return

    # --- Outfit suggestions triggered on like/super-like ---
    if fb.like > 0 or fb.super_like:
        complementary_item = find_complementary_item(idx, u)
        if complementary_item:
            suggestion = {
                "is_outfit_suggestion": True,
                "original_item": dict(PRODUCTS[idx]),
                "suggested_item": dict(complementary_item),
            }
            u["outfit_suggestions"].append(suggestion)

    # --- Session vector weighting ---
    if fb.saved:
        weight = 3.5   # ✅ even stronger than super_like
    elif fb.super_like:
        weight = 3.0
    elif fb.like > 0:
        weight = 1.0
    else:
        weight = -1.0

    cur = u.get("session_vec")
    vec = X[idx]
    if cur is None:
        u["session_vec"] = (weight * vec)
    else:
        alpha = 0.4
        u["session_vec"] = (alpha * cur + (1 - alpha) * (weight * vec))

    # --- Attribute preference scoring ---
    feedback_score = 0
    if fb.saved:
        feedback_score = 3.0   # ✅ strongest signal
    elif fb.super_like:
        feedback_score = 2.0
    elif fb.soft_like:
        feedback_score = 1.25
    elif fb.like > 0:
        feedback_score = 1.0
    elif fb.like < 0:
        feedback_score = -0.7

    if feedback_score != 0:
        it = PRODUCTS[idx]
        p_type = (it.get("type") or it.get("category") or "").lower().strip()
        p_color = (it.get("color") or "").lower().strip()
        p_brand = (it.get("brand") or "").lower().strip()
        if p_type:
            u["attr_prefs"]["type"][p_type] = u["attr_prefs"]["type"].get(p_type, 0) + (feedback_score * 1.2)
        if p_color:
            u["attr_prefs"]["color"][p_color] = u["attr_prefs"]["color"].get(p_color, 0) + (feedback_score * 0.8)
        if p_brand:
            u["attr_prefs"]["brand"][p_brand] = u["attr_prefs"]["brand"].get(p_brand, 0) + (feedback_score * 1.0)

    # --- Super-like guarantee queue ---
    if fb.super_like:
        target_item = PRODUCTS[idx]
        target_type = (target_item.get("type") or "").lower().strip()
        target_color = (target_item.get("color") or "").lower().strip()
        if target_type and target_color:
            guaranteed_queue = [
                get_pid(p)
                for i, p in enumerate(PRODUCTS)
                if get_pid(p) not in u["seen"]
                and i != idx
                and (p.get("type") or "").lower().strip() == target_type
                and (p.get("color") or "").lower().strip() == target_color
            ]
            random.shuffle(guaranteed_queue)
            u["super_queue"] = guaranteed_queue[:20] + u["super_queue"]

def create_ideal_vector(u: Dict[str, Any]):
    prefs = u.get("attr_prefs", {})
    if not prefs:
        return None
    type_prefs = prefs.get("type", {})
    color_prefs = prefs.get("color", {})
    top_type = max(type_prefs, key=type_prefs.get, default=None) if type_prefs else None
    top_color = max(color_prefs, key=color_prefs.get, default=None) if color_prefs else None
    if not top_type and not top_color:
        return None

    vecs = [X[i] for i, p in enumerate(PRODUCTS)
            if ((top_type and (p.get("type") or "").lower().strip() == top_type)
                and (top_color and (p.get("color") or "").lower().strip() == top_color))]
    if not vecs:
        vecs = [X[i] for i, p in enumerate(PRODUCTS)
                if ((top_type and (p.get("type") or "").lower().strip() == top_type)
                    or (top_color and (p.get("color") or "").lower().strip() == top_color))]
    if vecs:
        return np.mean(vecs, axis=0).astype("float32")
    return None

def attr_score(idx: int, user_profile: Dict[str, Any]):
    item = PRODUCTS[idx]
    prefs = user_profile.get("attr_prefs", {})
    if not prefs:
        return 0.0
    weights = {"brand": 1.0, "type": 1.2, "color": 0.8}
    score = 0.0
    score += (prefs.get("brand", {}).get((item.get("brand") or "").lower().strip(), 0)) * weights["brand"]
    score += (prefs.get("type", {}).get((item.get("type") or "").lower().strip(), 0)) * weights["type"]
    score += (prefs.get("color", {}).get((item.get("color") or "").lower().strip(), 0)) * weights["color"]
    return score

def mmr_select(candidates: List[int], k: int, emb_matrix: np.ndarray, lambda_: float):
    if not candidates or k <= 0:
        return []
    k = min(k, len(candidates))
    selected_indices = [candidates[0]]
    remaining_indices = candidates[1:]

    cand_vectors = emb_matrix[candidates]

    for _ in range(k - 1):
        if not remaining_indices:
            break

        remaining_vectors = emb_matrix[remaining_indices]
        selected_vectors = emb_matrix[selected_indices]

        # Relevance score (similarity to the original query, proxied by similarity to first candidate)
        relevance = remaining_vectors @ cand_vectors[0].T

        # Diversity score (max similarity to already selected items)
        similarity_to_selected = np.max(remaining_vectors @ selected_vectors.T, axis=1)

        mmr_scores = lambda_ * relevance - (1 - lambda_) * similarity_to_selected

        best_idx_in_remaining = int(np.argmax(mmr_scores))
        best_overall_idx = remaining_indices.pop(best_idx_in_remaining)
        selected_indices.append(best_overall_idx)

    return selected_indices

def recommend(uid: str, n: int = 20):
    u = ensure_user(uid)
    out: List[Dict[str, Any]] = []

    # Prioritize serving outfit suggestions first (they are suggestion objects)
    if u.get("outfit_suggestions"):
        out.append(u["outfit_suggestions"].pop(0))

    # Serve any pending super_like guarantees
    while u["super_queue"] and len(out) < n:
        pid = u["super_queue"].pop(0)
        if pid in u["seen"]:
            continue
        idx = PID_TO_IDX.get(pid)
        if idx is not None:
            out.append(dict(PRODUCTS[idx]))

    if len(out) >= n:
        # mark underlying products as seen (handle suggestion wrappers)
        for item in out:
            if isinstance(item, dict) and item.get("is_outfit_suggestion"):
                target = item.get("suggested_item")
                if isinstance(target, dict):
                    u["seen"].add(get_pid(target))
            else:
                u["seen"].add(get_pid(item))
        return out[:n]

    base_vec = u.get("session_vec")
    ideal_vec = create_ideal_vector(u)
    if u.get("calibration_vec") is not None:
        base_vec = u.get("calibration_vec")
    elif ideal_vec is not None:
        if base_vec is None:
            base_vec = ideal_vec
        else:
            base_vec = 0.5 * base_vec + 0.5 * ideal_vec

    if base_vec is None:
        pool = [i for i in range(N) if get_pid(PRODUCTS[i]) not in u["seen"]]
        selected_idxs = random.sample(pool, min(len(pool), n)) if pool else []
    else:
        q = base_vec.reshape(1, -1).astype("float32")
        if HAS_FAISS:
            faiss.normalize_L2(q)
            _, Idxs = index.search(q, min(RETRIEVE_K, N))
            candidate_idxs = [int(i) for i in Idxs[0] if get_pid(PRODUCTS[int(i)]) not in u["seen"]]
        else:
            scores = (X @ q.T).flatten()
            idxs = np.argsort(-scores)[:RETRIEVE_K]
            candidate_idxs = [int(i) for i in idxs if get_pid(PRODUCTS[int(i)]) not in u["seen"]]

        scored = [(0.4 * float(np.dot(X[i], base_vec)) + 0.6 * attr_score(i, u), i) for i in candidate_idxs]
        scored.sort(reverse=True, key=lambda t: t[0])
        ranked_idxs = [idx for _, idx in scored]
        selected_idxs = mmr_select(ranked_idxs, k=min(n, len(ranked_idxs)), emb_matrix=X, lambda_=MMR_LAMBDA)

    for idx in selected_idxs:
        if len(out) >= n:
            break
        out.append(dict(PRODUCTS[idx]))

    # mark seen (handle both suggestions and plain products)
    for item in out:
        if isinstance(item, dict) and item.get("is_outfit_suggestion"):
            target = item.get("suggested_item")
            if isinstance(target, dict):
                u["seen"].add(get_pid(target))
        else:
            u["seen"].add(get_pid(item))
    return out

# ===================== 5. API Endpoints ===============================


class CalibrateRequest(BaseModel):
    user: str
    category: str

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/feedback")
def api_feedback(fb: Feedback):
    apply_feedback(fb)
    return {"ok": True}

@app.get("/next")
def api_next(user: str = "demo", n: int = 20):
    return recommend(user, n)

@app.post("/calibrate")
def api_calibrate(req: CalibrateRequest):
    u = ensure_user(req.user)

    # Find all items of the chosen category
    category_vectors = [
        X[i] for i, p in enumerate(PRODUCTS)
        if (p.get("type") or "").lower().strip() == req.category.lower()
    ]

    if category_vectors:
        # Create a new "ideal vector" for that category and set it as the calibration
        calibration_vec = np.mean(category_vectors, axis=0).astype("float32")
        u["calibration_vec"] = calibration_vec

        # Clear out old preferences to make the change immediate and obvious
        u["session_vec"] = calibration_vec  # Also prime the session vector
        u["attr_prefs"] = {"type": {req.category.lower(): 5}, "color": {}, "brand": {}}
        u["super_queue"] = []
        u["seen"].clear()

    return {"ok": True, "found_items": len(category_vectors)}

@app.get("/debug/item")
def debug_item(pid: Optional[str] = None, url: Optional[str] = None, user: str = "demo"):
    u = USERS.get(user); idx = None
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    if pid:
        idx = PID_TO_IDX.get(pid)
    elif url:
        idx = URL_TO_IDX.get(url)
    else:
        raise HTTPException(status_code=400, detail="pid or url required.")
    if idx is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    item = PRODUCTS[idx]
    a_score = attr_score(idx, u)
    emb_sim = float(np.dot(X[idx], u.get("session_vec", np.zeros(D)))) if u.get("session_vec") is not None else 0.0
    return {
        "product_details": {
            "pid": get_pid(item),
            "name": item.get("name"),
            "type": item.get("type"),
            "color": item.get("color"),
            "brand": item.get("brand")
        },
        "current_user_profile": {"attr_prefs": u.get("attr_prefs")},
        "scoring_breakdown": {
            "attribute_score": a_score,
            "embedding_similarity": emb_sim,
            "final_combined_score": 0.4 * emb_sim + 0.6 * a_score
        }
    }

# On-demand outfit endpoint
@app.get("/outfit")
def api_get_outfit(pid: str, user: str = "demo"):
    """
    Finds the best complementary item for a given product ID on demand.
    """
    u = ensure_user(user)
    idx = PID_TO_IDX.get(pid)
    if idx is None:
        raise HTTPException(status_code=404, detail="Original product not found.")

    suggested_item = find_complementary_item(idx, u)
    if suggested_item is None:
        raise HTTPException(status_code=404, detail="No complementary item found.")

    return {
        "original_item": PRODUCTS[idx],
        "suggested_item": suggested_item
    }

@app.on_event("startup")
def on_startup():
    print(f"[startup] loaded {N} products, emb dim={D}, faiss={HAS_FAISS}")
