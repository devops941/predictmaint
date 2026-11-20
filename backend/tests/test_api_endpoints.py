import pytest
from app.api.v1.routers.auth import login, get_me
from app.api.v1.routers.machines import list_machines, get_machine_passport
from app.api.v1.routers.floor import get_plant_floor_data
from app.api.v1.routers.uploads import get_upload_template, get_upload_sample
from app.schemas.auth import LoginRequest

def sync_await(coro):
    """Execute coroutine to completion without OS event loop blocking."""
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value

def test_auth_login_and_me():
    # Test valid engineer login
    req = LoginRequest(email="engineer@predictmaint.ai", password="PredictMaint2026!")
    auth_resp = sync_await(login(req))
    assert auth_resp.access_token is not None
    assert auth_resp.user.role == "Reliability Engineer"
    assert auth_resp.user.email == "engineer@predictmaint.ai"

    # Test profile retrieval
    payload = {
        "sub": auth_resp.user.id,
        "email": auth_resp.user.email,
        "role": auth_resp.user.role,
        "name": auth_resp.user.name,
        "line_ids": auth_resp.user.line_ids
    }
    profile = sync_await(get_me(user_payload=payload))
    assert profile["email"] == "engineer@predictmaint.ai"

def test_plant_floor_and_machines():
    admin_payload = {
        "sub": "user_admin",
        "email": "admin@predictmaint.ai",
        "role": "Admin",
        "name": "System Admin",
        "line_ids": []
    }
    floor_data = sync_await(get_plant_floor_data(user=admin_payload))
    assert "fleet_counts" in floor_data
    assert len(floor_data["machines"]) >= 12
    assert "top_5_at_risk" in floor_data

    # List all machines
    machines = sync_await(list_machines(line_id=None, user=admin_payload))
    assert len(machines) >= 12
    first_m = machines[0]
    assert "name" in first_m
    assert "health_index" in first_m

    # Machine passport
    passport = sync_await(get_machine_passport(id=first_m["id"], user=admin_payload))
    assert passport["machine"]["id"] == first_m["id"]
    assert "health_index" in passport
    assert "risk_score" in passport
    assert "sensors" in passport

def test_upload_templates():
    readings_tpl = sync_await(get_upload_template(kind="readings"))
    assert "vibration_rms_mm_s" in readings_tpl.body.decode("utf-8")

    maint_tpl = sync_await(get_upload_template(kind="maintenance"))
    assert "failure_mode" in maint_tpl.body.decode("utf-8")

    sample_csv = sync_await(get_upload_sample())
    assert "PRESS-01" in sample_csv.body.decode("utf-8")
