# PredictMaint AI — Sensor-Driven Industrial Equipment Failure & Maintenance Intelligence

> **2026 Industrial Control Room Edition**  
> High-reliability predictive maintenance decision support system powered by Fast-Sampling DSP Feature Engineering, Leakage-Free Lookahead Target Labeling, Cost-Optimal Threshold Sweeps, and MongoDB Atlas.

---

## 1. System Architecture & Directory Structure

The project root strictly contains only two dedicated application directories, preserving a pristine separation of concerns:

```
predictmaint/
├── backend/                  # FastAPI 0.115+, Python 3.12, PyMongo, Scikit-Learn
│   ├── app/
│   │   ├── api/v1/routers/  # 20 Modular industrial REST routers
│   │   ├── core/            # Config (pydantic-settings), security (JWT/bcrypt), logging
│   │   ├── db/              # Resilient dual-mode MongoDB Atlas engine & indexing
│   │   ├── engine/          # DSP, FFT, features, leakage masking, models, threshold sweep
│   │   └── schemas/         # Pydantic v2 schemas for all industrial entities
│   ├── data/                # Persisted snapshot data store (mock_store.json)
│   ├── scripts/             # seed_demo.py (synthetic sensor telemetry generator)
│   ├── tests/               # Pytest golden formula & API test suite (16/16 PASSED)
│   └── requirements.txt
├── frontend/                 # React 18, Vite 5, TypeScript 5, Tailwind CSS, IBM Carbon Icons
│   ├── src/
│   │   ├── components/      # DialGauge, StripChart, Minimap, ThreeWaySelector, Plate, Header
│   │   ├── features/
│   │   │   ├── auth/        # StartPanel (mechanical START button login)
│   │   │   ├── landing/     # Interactive P-F curve hero with days-warning slider
│   │   │   ├── floor/       # Interactive SVG Plant Floor map & top 5 at-risk assets
│   │   │   ├── machine/     # Machine Passport dossier & multi-sensor strip recorder
│   │   │   ├── receiving/   # Room 1: Roller-shutter upload dock & Scan-Fix Wizard
│   │   │   ├── control/     # Room 2: Strip charts, A/B compare, t-minus aligned
│   │   │   ├── workshop/    # Room 3: Feature assembly line (Resample -> Label)
│   │   │   ├── lab/         # Room 4: 1U Model Rack with status LEDs & validation
│   │   │   ├── bench/       # Room 5: Evaluation scoreboard, cost curves, replay player
│   │   │   ├── dispatch/    # Room 6: Report press (PDF, Excel, CSV) & print queue
│   │   │   └── office/      # Room 7: 30-day maintenance plan & 3-way alarm review
│   │   ├── lib/             # apiRequest fetch client & AuthProvider context
│   │   └── types/           # TypeScript industrial entity definitions
│   └── package.json
├── .gitignore
├── PROJECT_SPEC_PREDICTMAINT.md
└── README.md
```

---

## 2. 2026 Industrial UI Design System (Zero Blue)

The user interface follows the 2026 industrial light control-room aesthetic. Standard digital SaaS blue is **strictly forbidden**.

- **Aluminium Plate** (`#EEF0F2`): Machine console background panels.
- **Machined Sheet White** (`#FFFFFF`): Instrument cards, dial faces, and reading grids.
- **Carbon Graphite** (`#1C1F24`): Primary typography and tactile wordmark.
- **Hi-Vis Safety Orange** (`#FF6A13`): High-voltage action buttons, active rack LEDs, and primary accents.
- **Cold Steel Gray** (`#5B6B7C`): Nominal machinery health and conveyor assembly blocks.
- **Watch Amber** (`#B58100`): Preventive inspection flags (35%–55% failure risk).
- **Fault Red Tag** (`#A8201F`): Critical threshold alarms and impending functional failures (>60% risk).
- **Industrial Typography**:
  - Headings: `Big Shoulders Display` (condensed industrial signage font)
  - Body & Specs: `Barlow` (DIN-adjacent engineering sans-serif)
  - Figures & Telemetry: `Share Tech Mono` (tabular monospaced readings & timestamps)

---

## 3. The 7 Plant Control Rooms (Keys 1–7)

Navigate instantly using the persistent **Plant Minimap** widget in the console header or single-key keyboard shortcuts `1` through `7`:

1. **Room 1: Receiving Dock (`/receiving`)**:
   - Styled like an industrial roller-shutter freight bay.
   - **Data Upload**: Accepts CSV/Excel telemetry streams up to 25 MB.
   - **Scan & Fix Wizard**: Audits dataset for timestamp gaps, zero-variance flatlines, physical limit spikes, and unit discrepancies (°F vs °C, bar vs psi). Provides one-click automated remediation and release to MongoDB.
   - Quick Single-Reading Field Dispatch entry form and Machine Asset Registry.
2. **Room 2: Control Room (`/control`)**:
   - Paperless multi-channel Strip-Chart Recorder with channel isolators.
   - Machine A vs Machine B comparative overlay explorer.
   - Event-aligned degradation curves (median trend and spread synchronized at $T = 0$ functional failure).
3. **Room 3: Workshop (`/workshop`)**:
   - Visual assembly line of DSP feature engineering stations: Resample (10m) $\rightarrow$ Clean $\rightarrow$ Rolling Window (60m/24h) $\rightarrow$ Extract (FFT, Crest factor, Kurtosis, Temp/Current ratio) $\rightarrow$ Normalise $\rightarrow$ Target Label.
   - Feature inventory table with importance weights, missing percentages, and zero-leakage verification audits.
4. **Room 4: Lab (`/lab`)**:
   - 1U Server Rack Chassis with active status LEDs (Draft, Validated, Active, Retired).
   - Lifecycle promotion to live production scoring with mandatory Reliability Engineer sign-off rationale.
5. **Room 5: Evaluation Bench (`/bench`)**:
   - Detector candidate Scoreboard comparing ML models against Static Rules and 3-Sigma EWMA Control Charts.
   - Precision-Recall (PR) Curve overlaid across models.
   - Cost Curve with draggable threshold slider balancing $C_{miss}$ (\$50,000) vs $C_{false}$ (\$2,000).
   - Interactive Failure Replay player with 10-day scrub slider before catastrophic breakdown.
6. **Room 6: Dispatch (`/dispatch`)**:
   - Automated Report Press with 4 compliance templates: Machine Health Dossier, Plant Weekly Briefing, Model Validation Pack, and Prioritized Maintenance Schedule.
   - Direct download in PDF, Excel (.xlsx), and CSV.
7. **Room 7: Maintenance Office (`/office`)**:
   - 30-Day Prioritized Maintenance Schedule ranked by Priority Score = Failure Risk $\times$ Criticality $\times$ Downtime Cost.
   - **3-Position Alarm Review**: Technicians evaluate active alarms with `[False alarm | Needs check | Confirmed fault]` using keys `1`, `2`, or `3`, closing alarms and feeding back into retraining folds.
   - System Configuration parameters, User Management, and MongoDB Audit Trail.

---

## 4. Pre-Configured Demo Accounts

All demo accounts use the standard industrial passphrase: **`PredictMaint2026!`**

| Email | Operator Name | Assigned Role | Access Scope |
|---|---|---|---|
| `admin@predictmaint.ai` | Clara Vance | **Admin** | Full system administration, user CRUD, global thresholds |
| `engineer@predictmaint.ai` | Marcus Vance | **Reliability Engineer** | Model promotion, feature engineering, cost curves, all lines |
| `tech@predictmaint.ai` | Elena Rostova | **Technician** | Line Alpha & Beta, alarm reviews, field readings, upload dock |
| `viewer@predictmaint.ai` | David Chen | **Viewer** | Read-only dashboards, trend charts, report downloads |

---

## 5. Quick Start Instructions

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm

### A. Backend Setup & Startup
```powershell
# 1. Navigate to backend directory
cd backend

# 2. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Verify .env file is present with MongoDB Atlas connection string:
# MONGODB_URI="mongodb+srv://devops_db_user:jcj8Mkf1GQKJ1ZGl@cluster0.uurxkmz.mongodb.net/"

# 4. Start FastAPI uvicorn server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation will be live at `http://localhost:8000/docs`.*

### B. Frontend Setup & Startup
```powershell
# 1. In a separate terminal, navigate to frontend directory
cd frontend

# 2. Start Vite development server
npm run dev
```
*Open your browser and navigate to `http://localhost:5173`.*

---

## 6. Verification & Automated Testing

The complete test suite verifies the golden mathematical formulas, data leakage boundaries, and API routers:

```powershell
# Run all backend unit tests from project root
$env:PYTHONPATH='backend'; .\backend\.venv\Scripts\pytest backend\tests -v
```

### Test Suite Results:
- `backend/tests/test_golden_engine.py`: 5/5 PASSED (FFT dominant frequency, RMS, crest factor, health index degradation baseline, physical range clamp, Celsius conversion).
- `backend/tests/test_config.py`: 4/4 PASSED (Fail-fast on missing/placeholder URI, short JWT secret, password masking in logs).
- `backend/tests/test_leakage_and_labels.py`: 2/2 PASSED (Lookahead horizon labeling, maintenance blackout masking, zero future leakage validation).
- `backend/tests/test_metrics_and_threshold.py`: 2/2 PASSED (PR-AUC, Recall, Cost curve threshold sweep).
- `backend/tests/test_api_endpoints.py`: 3/3 PASSED (Auth login, JWT profile, Plant floor telemetry, Machine passport, CSV templates).

**Total: 16/16 PASSED (100% Pass Rate)**

```powershell
# Verify frontend compilation
cd frontend; npm run build
```
**Vite & TypeScript compilation: 0 errors, production bundle generated in `dist/`.**
