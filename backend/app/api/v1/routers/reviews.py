from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends
from app.core.security import get_current_user_payload
from app.db.storage import get_collection, persist_mock_store
from app.schemas.alert import ReviewCreateRequest, ReviewResponse

router = APIRouter(prefix="/reviews", tags=["Alarm Reviews & Feedback"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_reviews(user: Dict[str, Any] = Depends(get_current_user_payload)):
    reviews_col = get_collection("reviews")
    docs = list(reviews_col.find().sort("reviewed_at", -1))
    return [
        {
            "id": str(d["_id"]),
            "alert_id": d.get("alert_id"),
            "outcome": d.get("outcome"),
            "root_cause": d.get("root_cause"),
            "notes": d.get("notes"),
            "reviewer": d.get("reviewer"),
            "reviewed_at": d.get("reviewed_at", datetime.now(timezone.utc))
        }
        for d in docs
    ]

@router.post("", response_model=ReviewResponse)
async def submit_review(
    req: ReviewCreateRequest,
    user: Dict[str, Any] = Depends(get_current_user_payload)
):
    """
    Office Inspection Form review submission:
    Records technician feedback:
    [False alarm | Needs check | Confirmed fault], root cause, and notes.
    Feeds back into training set and closes the alert.
    """
    reviews_col = get_collection("reviews")
    alerts_col = get_collection("alerts")
    now = datetime.now(timezone.utc)
    reviewer_name = user.get("name", user.get("email"))

    review_doc = {
        "alert_id": req.alert_id,
        "outcome": req.outcome,
        "root_cause": req.root_cause,
        "notes": req.notes,
        "reviewer": reviewer_name,
        "reviewed_at": now
    }
    res = reviews_col.insert_one(review_doc)
    review_id = str(res.inserted_id)

    # Close/update alert
    if ObjectId.is_valid(req.alert_id):
        alerts_col.update_one(
            {"_id": ObjectId(req.alert_id)},
            {"$set": {"status": "reviewed", "review_id": review_id}}
        )

    persist_mock_store()
    return ReviewResponse(
        id=review_id,
        alert_id=req.alert_id,
        outcome=req.outcome,
        root_cause=req.root_cause,
        notes=req.notes,
        reviewer=reviewer_name,
        reviewed_at=now
    )
