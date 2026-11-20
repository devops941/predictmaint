from datetime import datetime, timedelta, timezone
import random
from typing import Any, Dict, List
from bson import ObjectId
import numpy as np

from app.core.config import settings
from app.core.logging import logger
from app.core.security import hash_password
from app.db.indexes import create_all_indexes
from app.db.storage import get_collection, persist_mock_store

MACHINES_SPEC = [
    # Line 1: Machining & Stamping
    {"name": "PRESS-01", "type": "pump", "mfg": "Schuler", "crit": 5, "cost": 9500.0, "line_idx": 0, "pos": {"room": "Bay A", "x": 120, "y": 80}},
    {"name": "MOTOR-02", "type": "motor", "mfg": "Siemens", "crit": 3, "cost": 4200.0, "line_idx": 0, "pos": {"room": "Bay A", "x": 260, "y": 80}},
    {"name": "PUMP-03", "type": "pump", "mfg": "Grundfos", "crit": 4, "cost": 6100.0, "line_idx": 0, "pos": {"room": "Bay A", "x": 400, "y": 80}},
    {"name": "CONV-04", "type": "conveyor", "mfg": "Dorner", "crit": 2, "cost": 2800.0, "line_idx": 0, "pos": {"room": "Bay A", "x": 540, "y": 80}},

    # Line 2: Heavy Compression & Drives
    {"name": "COMP-05", "type": "compressor", "mfg": "Atlas Copco", "crit": 5, "cost": 11000.0, "line_idx": 1, "pos": {"room": "Bay B", "x": 120, "y": 200}},
    {"name": "PUMP-06", "type": "pump", "mfg": "Sulzer", "crit": 4, "cost": 5500.0, "line_idx": 1, "pos": {"room": "Bay B", "x": 260, "y": 200}},
    {"name": "GEAR-07", "type": "gearbox", "mfg": "SEW Eurodrive", "crit": 4, "cost": 7200.0, "line_idx": 1, "pos": {"room": "Bay B", "x": 400, "y": 200}},
    {"name": "MOTOR-08", "type": "motor", "mfg": "ABB", "crit": 3, "cost": 4800.0, "line_idx": 1, "pos": {"room": "Bay B", "x": 540, "y": 200}},

    # Line 3: Finishing & Packaging
    {"name": "PRESS-09", "type": "pump", "mfg": "Komatsu", "crit": 4, "cost": 8400.0, "line_idx": 2, "pos": {"room": "Bay C", "x": 120, "y": 320}},
    {"name": "COMP-10", "type": "compressor", "mfg": "Ingersoll Rand", "crit": 5, "cost": 10500.0, "line_idx": 2, "pos": {"room": "Bay C", "x": 260, "y": 320}},
    {"name": "PUMP-11", "type": "pump", "mfg": "Flowserve", "crit": 3, "cost": 5000.0, "line_idx": 2, "pos": {"room": "Bay C", "x": 400, "y": 320}},
    {"name": "GEAR-12", "type": "gearbox", "mfg": "Flender", "crit": 4, "cost": 6900.0, "line_idx": 2, "pos": {"room": "Bay C", "x": 540, "y": 320}},
]

SENSOR_TEMPLATES = [
    {"name": "Vibration RMS", "type": "vibration", "unit": "mm/s", "min_val": 0.0, "max_val": 50.0, "sampling_seconds": 600, "base": 2.4, "noise": 0.3},
    {"name": "Bearing Temp", "type": "temperature", "unit": "°C", "min_val": 0.0, "max_val": 150.0, "sampling_seconds": 600, "base": 58.0, "noise": 2.5},
    {"name": "Motor Current", "type": "current", "unit": "A", "min_val": 0.0, "max_val": 250.0, "sampling_seconds": 600, "base": 64.0, "noise": 3.0},
    {"name": "Line Pressure", "type": "pressure", "unit": "bar", "min_val": 0.0, "max_val": 30.0, "sampling_seconds": 600, "base": 6.8, "noise": 0.4},
    {"name": "Rotational Speed", "type": "speed", "unit": "rpm", "min_val": 0.0, "max_val": 4000.0, "sampling_seconds": 600, "base": 1480.0, "noise": 15.0},
]

def seed_database():
    logger.info("Initializing collections and indexes...")
    create_all_indexes()

    # 1. Plants and Lines
    logger.info("Seeding plants and lines...")
    plants_col = get_collection("plants")
    lines_col = get_collection("lines")
    plants_col.delete_many({})
    lines_col.delete_many({})

    plant_doc = {
        "_id": ObjectId("673e00000000000000000001"),
        "name": "Apex Advanced Manufacturing Plant 01",
        "location": "Sector 4 Industrial Corridor",
        "created_at": datetime.now(timezone.utc)
    }
    plants_col.insert_one(plant_doc)

    lines = [
        {"_id": ObjectId("673e00000000000000000011"), "plant_id": str(plant_doc["_id"]), "name": "Line 1 — Stamping & Primary Press", "code": "L1"},
        {"_id": ObjectId("673e00000000000000000012"), "plant_id": str(plant_doc["_id"]), "name": "Line 2 — Drive Trains & Compression", "code": "L2"},
        {"_id": ObjectId("673e00000000000000000013"), "plant_id": str(plant_doc["_id"]), "name": "Line 3 — Finishing & Secondary Packaging", "code": "L3"},
    ]
    lines_col.insert_many(lines)
    line_ids = [str(l["_id"]) for l in lines]

    # 2. Users (Admin, Reliability Engineer, Technician, Viewer)
    logger.info("Seeding demo users...")
    users_col = get_collection("users")
    users_col.delete_many({})
    hashed_pwd = hash_password(settings.DEMO_USER_PASSWORD)

    users = [
        {
            "email": "admin@predictmaint.ai",
            "name": "Sarah Connor (Chief Plant Engineer)",
            "role": "Admin",
            "line_ids": line_ids,
            "password_hash": hashed_pwd,
            "status": "active",
            "must_change_password": False,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "email": "engineer@predictmaint.ai",
            "name": "Marcus Vance (Reliability Engineer)",
            "role": "Reliability Engineer",
            "line_ids": line_ids,
            "password_hash": hashed_pwd,
            "status": "active",
            "must_change_password": False,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "email": "tech@predictmaint.ai",
            "name": "Alex Mercer (Senior Line Technician)",
            "role": "Technician",
            "line_ids": [line_ids[0], line_ids[1]],
            "password_hash": hashed_pwd,
            "status": "active",
            "must_change_password": False,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "email": "viewer@predictmaint.ai",
            "name": "Elena Rostova (Operations Director)",
            "role": "Viewer",
            "line_ids": line_ids,
            "password_hash": hashed_pwd,
            "status": "active",
            "must_change_password": False,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    users_col.insert_many(users)

    # 3. Machines & Sensors
    logger.info("Seeding machines and sensors...")
    machines_col = get_collection("machines")
    sensors_col = get_collection("sensors")
    machines_col.delete_many({})
    sensors_col.delete_many({})

    machines_to_insert = []
    sensors_to_insert = []
    machine_ids = []

    for i, m_spec in enumerate(MACHINES_SPEC):
        m_id = ObjectId()
        machine_ids.append(str(m_id))
        
        if i == 0:
            state, hi, risk = "Critical", 18.4, 0.92
        elif i == 4:
            state, hi, risk = "Alert", 41.2, 0.74
        elif i == 6 or i == 9:
            state, hi, risk = "Watch", 64.5, 0.46
        else:
            state, hi, risk = "Healthy", round(random.uniform(88.0, 99.0), 1), round(random.uniform(0.04, 0.18), 2)

        m_doc = {
            "_id": m_id,
            "line_id": line_ids[m_spec["line_idx"]],
            "name": m_spec["name"],
            "type": m_spec["type"],
            "manufacturer": m_spec["mfg"],
            "install_date": "2021-03-15",
            "criticality": m_spec["crit"],
            "downtime_cost_per_hour": m_spec["cost"],
            "map_position": m_spec["pos"],
            "active": True,
            "health_index": hi,
            "risk_score": risk,
            "state": state,
            "last_maintenance": "2026-10-18T14:30:00Z"
        }
        machines_to_insert.append(m_doc)

        for s_idx, s_tmpl in enumerate(SENSOR_TEMPLATES):
            s_id = ObjectId()
            sensors_to_insert.append({
                "_id": s_id,
                "machine_id": str(m_id),
                "name": s_tmpl["name"],
                "type": s_tmpl["type"],
                "unit": s_tmpl["unit"],
                "min_val": s_tmpl["min_val"],
                "max_val": s_tmpl["max_val"],
                "sampling_seconds": s_tmpl["sampling_seconds"],
                "base": s_tmpl["base"],
                "noise": s_tmpl["noise"]
            })

    machines_col.insert_many(machines_to_insert)
    sensors_col.insert_many(sensors_to_insert)

    # 4. Generate Synthetic Sensor Readings
    logger.info("Generating synthetic sensor readings (Illustrative synthetic sensor data — not from real machines)...")
    readings_col = get_collection("sensor_readings")
    readings_col.delete_many({})

    readings_batch = []
    now = datetime.now(timezone.utc)
    num_hours = 24  # 24 hours of hourly readings: optimal for lightning load and rich charts
    start_time = now - timedelta(hours=num_hours)

    random.seed(42)
    np.random.seed(42)

    for m_idx, m_doc in enumerate(machines_to_insert):
        m_id_str = str(m_doc["_id"])
        m_sensors = [s for s in sensors_to_insert if s["machine_id"] == m_id_str]
        is_degrading = (m_idx == 0 or m_idx == 4)

        for h in range(num_hours):
            current_t = start_time + timedelta(hours=h)
            progress = h / num_hours

            for s in m_sensors:
                base = s["base"]
                noise = np.random.normal(0, s["noise"])
                val = base + noise

                if is_degrading and progress > 0.65:
                    deg_factor = (progress - 0.65) / 0.35
                    if s["type"] == "vibration":
                        val += deg_factor * 8.5
                    elif s["type"] == "temperature":
                        val += deg_factor * 34.0

                val = max(s["min_val"], min(s["max_val"], val))

                readings_batch.append({
                    "ts": current_t,
                    "meta": {
                        "machine_id": m_id_str,
                        "sensor_id": str(s["_id"]),
                        "sensor_name": s["name"]
                    },
                    "value": round(float(val), 2),
                    "status": "valid"
                })

                if len(readings_batch) >= 1000:
                    readings_col.insert_many(readings_batch)
                    readings_batch = []

    if readings_batch:
        readings_col.insert_many(readings_batch)

    # 5. Maintenance Events & Failures
    logger.info("Seeding maintenance events...")
    maint_col = get_collection("maintenance_events")
    maint_col.delete_many({})
    events = [
        {
            "machine_id": machine_ids[0],
            "type": "inspection",
            "start": now - timedelta(days=22),
            "end": now - timedelta(days=22) + timedelta(hours=3),
            "failure_mode": "Normal wear",
            "root_cause": "Routine 30-day lubrication and alignment inspection",
            "parts": ["ISO VG 460 Synthetic Grease"],
            "downtime_hours": 3.0,
            "cost": 1200.0,
            "notes": "Bearing clearances within tolerance.",
            "entered_by": "Alex Mercer",
            "created_at": now - timedelta(days=22)
        },
        {
            "machine_id": machine_ids[4],
            "type": "corrective",
            "start": now - timedelta(days=12),
            "end": now - timedelta(days=12) + timedelta(hours=6),
            "failure_mode": "Overheating / Oil Seal Leak",
            "root_cause": "Degraded mechanical seal resulting in lubricant seepage",
            "parts": ["Viton Oil Seal 85mm", "Synthetic Compressor Oil 20L"],
            "downtime_hours": 6.0,
            "cost": 4500.0,
            "notes": "Emergency gasket replacement completed.",
            "entered_by": "Alex Mercer",
            "created_at": now - timedelta(days=12)
        },
        {
            "machine_id": machine_ids[1],
            "type": "preventive",
            "start": now - timedelta(days=5),
            "end": now - timedelta(days=5) + timedelta(hours=2),
            "failure_mode": None,
            "root_cause": "Quarterly motor insulation resistance test",
            "parts": [],
            "downtime_hours": 2.0,
            "cost": 800.0,
            "notes": "Megger readings satisfactory (>100 MOhm).",
            "entered_by": "Sarah Connor",
            "created_at": now - timedelta(days=5)
        }
    ]
    maint_col.insert_many(events)

    # 6. Seed Alerts
    logger.info("Seeding initial alerts and models...")
    alerts_col = get_collection("alerts")
    alerts_col.delete_many({})
    alert_doc = {
        "machine_id": machine_ids[0],
        "machine_name": "PRESS-01",
        "severity": "Critical",
        "risk_score": 0.92,
        "opened_at": now - timedelta(hours=4),
        "status": "open",
        "top_features": [
            {
                "feature": "vibration_rms",
                "sensor": "Vibration",
                "current_value": 11.2,
                "baseline_value": 2.4,
                "deviation_z": 5.8,
                "contribution_pct": 54.2
            },
            {
                "feature": "bearing_temp_mean",
                "sensor": "Temperature",
                "current_value": 91.5,
                "baseline_value": 58.0,
                "deviation_z": 4.2,
                "contribution_pct": 31.6
            },
            {
                "feature": "temp_per_amp",
                "sensor": "Operational",
                "current_value": 1.42,
                "baseline_value": 0.91,
                "deviation_z": 2.9,
                "contribution_pct": 14.2
            }
        ]
    }
    alerts_col.insert_one(alert_doc)

    # 7. Seed Initial Feature Set & Models
    feat_col = get_collection("feature_sets")
    feat_col.delete_many({})
    feature_set = {
        "name": "Standard Industrial Feature Pack v1",
        "version": "pm-v1",
        "window_minutes": 60,
        "step_minutes": 10,
        "horizon_hours": 72,
        "features": [
            {"name": "vibration_rms", "group": "statistical", "importance": 0.38, "missing_pct": 0.0, "leakage_passed": True},
            {"name": "vibration_kurt", "group": "statistical", "importance": 0.18, "missing_pct": 0.0, "leakage_passed": True},
            {"name": "temp_mean", "group": "statistical", "importance": 0.22, "missing_pct": 0.0, "leakage_passed": True},
            {"name": "current_mean", "group": "statistical", "importance": 0.08, "missing_pct": 0.0, "leakage_passed": True},
            {"name": "vib_fft_dom_freq", "group": "frequency", "importance": 0.14, "missing_pct": 0.0, "leakage_passed": True}
        ],
        "row_count": 8640,
        "status": "completed",
        "created_at": now - timedelta(days=2)
    }
    fs_res = feat_col.insert_one(feature_set)

    models_col = get_collection("models")
    models_col.delete_many({})
    models = [
        {
            "name": "Baseline ISO 10816 Threshold Rule",
            "family": "baseline_rule",
            "feature_set_id": str(fs_res.inserted_id),
            "trained_range": "2026-10-01 to 2026-11-15",
            "metrics": {"pr_auc": 0.62, "recall": 0.70, "f1": 0.65, "false_alarms_per_month": 4.2},
            "threshold": 0.50,
            "status": "validated",
            "created_at": now - timedelta(days=2),
            "version": "pm-v1"
        },
        {
            "name": "EWMA / CUSUM Control Chart",
            "family": "control_chart",
            "feature_set_id": str(fs_res.inserted_id),
            "trained_range": "2026-10-01 to 2026-11-15",
            "metrics": {"pr_auc": 0.74, "recall": 0.78, "f1": 0.73, "false_alarms_per_month": 2.8},
            "threshold": 0.55,
            "status": "validated",
            "created_at": now - timedelta(days=2),
            "version": "pm-v1"
        },
        {
            "name": "Isolation Forest Unsupervised Anomaly",
            "family": "isolation_forest",
            "feature_set_id": str(fs_res.inserted_id),
            "trained_range": "2026-10-01 to 2026-11-15",
            "metrics": {"pr_auc": 0.81, "recall": 0.82, "f1": 0.79, "false_alarms_per_month": 1.9},
            "threshold": 0.48,
            "status": "validated",
            "created_at": now - timedelta(days=1),
            "version": "pm-v1"
        },
        {
            "name": "Random Forest Failure Horizon Classifier",
            "family": "random_forest",
            "feature_set_id": str(fs_res.inserted_id),
            "trained_range": "2026-10-01 to 2026-11-15",
            "metrics": {"pr_auc": 0.89, "recall": 0.88, "f1": 0.86, "false_alarms_per_month": 0.8},
            "threshold": 0.45,
            "status": "active",
            "approved_by": "Marcus Vance",
            "approval_note": "Production active model: highest PR-AUC and acceptable false alarm rate.",
            "created_at": now - timedelta(hours=18),
            "version": "pm-v1"
        },
        {
            "name": "HistGradientBoosting Classifier",
            "family": "hist_gradient_boosting",
            "feature_set_id": str(fs_res.inserted_id),
            "trained_range": "2026-10-01 to 2026-11-15",
            "metrics": {"pr_auc": 0.91, "recall": 0.90, "f1": 0.87, "false_alarms_per_month": 0.6},
            "threshold": 0.42,
            "status": "validated",
            "created_at": now - timedelta(hours=12),
            "version": "pm-v1"
        }
    ]
    models_col.insert_many(models)

    # 8. Seed Maintenance Plan Items
    plan_col = get_collection("plan_items")
    plan_col.delete_many({})
    plan_items = [
        {
            "machine_id": machine_ids[0],
            "machine_name": "PRESS-01",
            "priority_score": 349600.0,
            "risk_prob": 0.92,
            "criticality": 5,
            "downtime_cost": 9500.0,
            "window_start": now + timedelta(hours=8),
            "window_end": now + timedelta(hours=14),
            "suggested_action": "Emergency vibration spectrum analysis and main hydraulic bearing replacement",
            "rationale": "High failure probability (92%) within 72h. Criticality 5 ($9,500/hr downtime). Aligned with Line 1 night shift maintenance window.",
            "status": "suggested"
        },
        {
            "machine_id": machine_ids[4],
            "machine_name": "COMP-05",
            "priority_score": 162800.0,
            "risk_prob": 0.74,
            "criticality": 5,
            "downtime_cost": 11000.0,
            "window_start": now + timedelta(hours=28),
            "window_end": now + timedelta(hours=34),
            "suggested_action": "Rotary screw air-end check & thermal imaging",
            "rationale": "Risk score 74%. Thermal anomalies detected. Proactive seal check recommended.",
            "status": "suggested"
        }
    ]
    plan_col.insert_many(plan_items)

    persist_mock_store()
    logger.info("Seeding completed successfully! All data labeled: Illustrative synthetic sensor data — not from real machines.")

if __name__ == "__main__":
    seed_database()
