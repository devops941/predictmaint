# PredictMaint AI — Sensor-Driven Industrial Equipment Failure & Maintenance Intelligence (Dashboard Website)
### Final-Year Project · Full-Stack Development Specification + Claude Code Phase Prompts
**Domain:** Industrial Engineering · **Relevance:** maintenance planning and reduced unplanned downtime
**Purpose:** decision **support** for maintenance engineers — advisory alerts only, NOT an automatic safety system and NOT a replacement for inspection.
**Stack:** React 18 + TypeScript (Vite) + Tailwind + shadcn/ui · FastAPI (Python) · MongoDB Atlas (incl. time-series collection) · all settings in `.env`

---
## 0. HARD RULES (apply in every phase)
1. **NOT Streamlit, NOT an upload-and-analyse tool.** A real website: landing page, login screens, role dashboards, and **data entry inside the dashboard** (sensor readings, maintenance events, machines).
2. **Python is the core.** Validation, feature engineering, anomaly detection, classification, evaluation, explanations, planning and reports live in reusable modules under `backend/app/engine/`. React only displays API results.
3. **Strict folders:** project root contains ONLY `backend/` and `frontend/` (plus README.md, .gitignore, this spec). All Python files, tests, scripts, `.venv`, `.env` inside `backend/`; all React files and `.env` inside `frontend/`. Frontend talks to backend only through HTTP.
4. **MongoDB Atlas** is the database (the brief's SQL/time-series options are replaced by MongoDB; use a native **time-series collection** for sensor readings). URI, DB name, JWT secret, CORS, upload limits come from `backend/.env` through `pydantic-settings`; fail fast if `MONGODB_URI` or `JWT_SECRET` is missing or a placeholder. The URI appears ONLY in `backend/.env` (git-ignored); never in code, logs, README, tests or commits. Commit only `.env.example`. Atlas user = `readWrite` on this database only.
5. **Light theme only.** Neat, clear, easy to understand. No dark mode.
6. **Latest packages:** check the latest stable version of every package (`npm view <pkg> version`, PyPI) before installing; pin exact versions; if the newest is incompatible use the newest compatible one and note it in the README.
7. **UI must be completely different from every other project** (colours, fonts, navigation, page structure, option positions) — see §10 and its banned list.
8. All seed data is **synthetic**, labelled "Illustrative synthetic sensor data — not from real machines".
9. Every phase ends with tests run, app run, errors fixed, and a commit.

---
## 1. VISION & PROBLEM
Machine sensor logs (vibration, temperature, current, pressure, speed) and maintenance history live in separate spreadsheets and CMMS exports. Engineers see failures only after they happen, and fixed-schedule maintenance wastes effort. **PredictMaint AI** lets a user log in, keep **machines, sensor readings and maintenance events** in the dashboard, explore **historical trends**, build **features** from raw signals, detect **abnormal operating patterns**, estimate **failure indicators (risk of failure within the next H hours)**, compare models honestly, turn risk into a **ranked maintenance plan**, let technicians **confirm or reject alarms** (feedback stored), and export **reports**.

## 2. OBJECTIVES
| # | Objective | Module |
|---|---|---|
| O1 | Reliable entry/upload of sensor readings and maintenance history with clear validation | Dataset Upload & Data Validation |
| O2 | See trends, compare machines, align sensor behaviour to failure events | Historical Trend Explorer |
| O3 | Window features, health indicators, labels without leakage | Feature Engineering & Pre-processing |
| O4 | Anomaly detection + failure-risk classification, versioned and validated | Prediction Model Management |
| O5 | Compare models on precision/recall, lead time, false alarms, cost | Forecast Comparison & Accuracy Dashboard |
| O6 | Reports, maintenance plan, technician review and feedback | Report Generation & Review |

## 3. ROLES & LOGIN
| Role | Can do |
|---|---|
| **Admin** | Users, plants/lines, thresholds, costs, audit logs, everything |
| **Reliability Engineer** | Features, models, evaluation, plan, reports, review decisions |
| **Technician** | Enter/upload readings and maintenance events for assigned lines; review alarms and record findings |
| **Viewer** (manager) | Read-only dashboards and published reports |
Screens: sign-in, forgot/reset password (token flow; dev link logged to console), first-login password change, session-expired notice. JWT access + refresh, bcrypt, slowapi rate-limit, lockout after 5 failures, role guards on every backend route, technician queries scoped to assigned `line_ids` server-side.

## 4. SYSTEM FLOW
```
Landing → Sign in → Plant Floor (home)
Technician: register machines & sensors → enter / upload readings + maintenance events → validate
   valid rows → sensor_readings (time-series) / maintenance_events;  doubtful rows → quality issues
Engineer: explore trends → build feature set (windows, FFT, health index) → create labels from failure events
   → train models (anomaly + classifier) with time-based, machine-grouped validation → compare → activate (after review approval)
Scoring job (Python): latest windows → risk score per machine → alarms (debounce, severity) → alerts
Technician review: confirm fault / false alarm / needs inspection + root cause → feedback → audit → feeds next training set
Planner: risk × criticality × downtime cost → ranked plan + suggested inspection windows (suggestions, not orders)
Reports: PDF / Excel / CSV from saved model + run ids
```

## 5. METHODS (pure, tested Python functions; formula_version = "pm-v1")
1. **Validation rules:** timestamp parse + timezone normalise to UTC; duplicate (machine, sensor, timestamp); per-sensor plausible range; unit conversion (°C/°F, mm/s↔in/s, bar↔psi); **flatline/stuck sensor** (zero variance over N samples); **spikes** (robust z > threshold); **gaps** vs expected sampling interval; clock-drift hint (machine vs server offset); maintenance event checks (end ≥ start, valid machine, type in preventive/corrective/inspection/replacement, failure mode code). Doubtful values are flagged, not silently dropped or filled.
2. **Pre-processing:** resample to fixed windows (e.g. 10 min / 1 h) with mean/median/last; fill gaps by linear interpolation only up to a small limit and mark `imputed`; operating-condition tagging (idle / running / high-load from speed & current).
3. **Feature extraction per sliding window (past data only):** mean, std, min, max, peak-to-peak, **RMS**, **crest factor**, skewness, **kurtosis**, linear **slope**, EWMA, rate of change, **FFT** dominant frequency and **band energy** (for high-rate vibration), cross-sensor ratios (e.g. temperature per amp), **load-normalised residual** (sensor value minus expected value from regression on load/speed), maintenance-aware features (hours since last maintenance, runtime hours, previous failure count).
4. **Health Index:** distance of the current feature vector from a **healthy baseline** (PCA reconstruction error or Mahalanobis distance); smoothed; thresholds for Watch/Alert/Critical from baseline percentiles.
5. **Labels:** `y = 1` if a failure event occurs within the next **H hours** (default 72 h, configurable); exclude repair/after-failure periods and maintenance-masked intervals; keep failure ids for event-level metrics.
6. **Leakage control:** time-based splits (train earlier / test later), **grouped by machine** folds, features computed with look-back only; tests prove no future data in a window.
7. **Models:**
   - Baselines: fixed-threshold rule; **Shewhart/EWMA/CUSUM** control charts on key sensors.
   - **Unsupervised anomaly:** Isolation Forest, PCA/Mahalanobis (and optional One-Class SVM).
   - **Supervised classifiers:** Logistic Regression, Random Forest, HistGradientBoosting with class weights; probability calibration; optional SMOTE only as an experiment (not default).
   - Optional **RUL estimate:** extrapolate the health-index degradation trend to the failure threshold with an interval; shown as "indicative".
8. **Metrics:** precision, recall, F1/F2, **PR-AUC** (primary, classes are imbalanced), ROC-AUC, confusion matrix, **false alarms per machine per month**, **event-level recall** (share of failures warned before they happened), **detection lead time** (hours between first valid alarm and failure), alarm precision after debounce.
9. **Cost-aware threshold:** `Cost = C_miss·FN + C_false·FP (+ inspection cost)`; sweep thresholds and choose the minimum; costs configured by Admin.
10. **Alarm management:** debounce (k of n windows), cool-down period, severity from score and persistence, suppression during planned maintenance.
11. **Explanations:** permutation importance (global); per-alarm "why" = top contributing features and deviation from baseline (SHAP via `shap` if installed, otherwise permutation/difference-from-baseline); sensor evidence strip for each alarm.
12. **Maintenance planning:** `Priority = P(failure within H) × criticality × downtime_cost_per_hour × expected_downtime_hours`; rank machines; propose inspection windows that fit the planned-shutdown calendar; cost-benefit: expected downtime avoided vs inspection cost. All suggestions require engineer approval.
Every model and run stores features, label horizon, data window, seeds, parameters, metrics and formula version → reproducible.

## 6. DATA ENTRY (inside the dashboard)
1. **Machine registry:** plant → line → machine (type, manufacturer, install date, criticality 1–5, downtime cost/hour) and sensors per machine (type, unit, range, sampling interval).
2. **Quick reading entry** (single timestamp, several sensors) and **Reading grid** (rows = timestamps, columns = sensors; paste from Excel; per-cell validation).
3. **Maintenance event form** (work order): machine, type, start/end, failure mode, root cause, parts, downtime hours, cost, notes.
4. **Upload wizard** for readings and maintenance history (CSV/Excel): template → file → column mapping + unit selection → **scan** → issues list with one-click fixes → duplicate policy (skip / replace with audit / reject) → confirm → result with rejected-rows CSV.
Messages show row, field, reason.

## 7. SEED DATA (synthetic, fixed seed)
3 lines, 12 machines (pumps, motors, compressors, conveyors, gearboxes), 5 sensors each (vibration RMS mm/s, bearing temperature °C, motor current A, pressure bar, speed rpm), ~120 days at 10-minute sampling (hourly for older data to limit size). 9 planted failures preceded by degradation patterns (bearing wear: vibration + temperature rising over days; lubrication loss; overload; blockage) and 2 **false-alarm traps** (sensor drift, process change). ~60 maintenance events. Planted data problems for tests: gaps, duplicates, a flatlined sensor, spikes, a °F-mixed series, clock drift. Demo users per role from `.env` demo password; saved feature set, 5 models (baseline, control chart, Isolation Forest, Random Forest, Gradient Boosting), one comparison, one report.

## 8. TECH STACK
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), TanStack Query + Table, React Hook Form + Zod, Recharts + custom SVG (strip-chart recorder, gauge dials, plant map, PR/cost curves), framer-motion, sonner, cmdk, react-router-dom, **Carbon icons** (`@carbon/icons-react`).
- **Backend:** Python 3.12, FastAPI, Pydantic v2 + pydantic-settings, PyMongo, Pandas, NumPy, SciPy, statsmodels, scikit-learn, shap (optional), openpyxl, ReportLab/WeasyPrint, PyJWT, bcrypt, slowapi.
- **Quality:** pytest (golden fixtures), Vitest, Playwright, ruff.

## 9. MONGODB COLLECTIONS
| Collection | Key fields | Indexes |
|---|---|---|
| `users` | email, password_hash, name, role, line_ids, status | unique email |
| `plants` / `lines` | name, parent, calendar (planned shutdowns) | unique name |
| `machines` | line_id, name, type, manufacturer, install_date, criticality, downtime_cost_per_hour, map_position{room,x,y}, active | unique (line,name) |
| `sensors` | machine_id, name, type, unit, min, max, sampling_seconds | (machine,name) |
| `sensor_readings` | **time-series collection**: timeField `ts`, metaField `{machine_id, sensor_id}`, value, status (valid/flagged/imputed), batch_id | granularity=minutes |
| `maintenance_events` | machine_id, type, start, end, failure_mode, root_cause, downtime_hours, cost, notes, entered_by | (machine,start) |
| `upload_batches` | kind, filename, checksum, mapping, units, counts, duplicate_policy, status, actor | checksum |
| `quality_issues` | machine_id, sensor_id, type, range, status, batch_id | status |
| `feature_sets` | name, window, step, features[], horizon_hours, baseline_ref, version | name |
| `models` | name, family, params, feature_set_id, trained_range, metrics, threshold, status (draft/validated/active/retired), approved_by | name |
| `evaluations` | model_ids[], split, metrics, curves, lead_times, costs | created_at |
| `predictions` | machine_id, ts, score, severity, model_id, top_features | (machine,ts) |
| `alerts` | machine_id, severity, opened_at, status, prediction_id, review_id | status |
| `reviews` | alert_id, outcome (confirmed/false_alarm/needs_check), root_cause, note, reviewer | alert_id |
| `plan_items` | machine_id, priority, window_start, window_end, rationale, status (suggested/approved/done) | status |
| `reports` | kind, model_id, filters, format, storage_key, status | created_at |
| `audit_logs` | actor, action, resource, safe_metadata, created_at | created_at |
Rules: UTC timestamps; role-scoped queries; bounded bulk inserts (batches); never embed readings in machine documents.

## 10. UI / UX DESIGN SYSTEM — "PLANT MINIMAP" (light theme, unique)

### 10.1 Concept
A **plant control room**: aluminium-light surfaces, graphite ink, hi-vis orange signals, label-maker tape titles, strip-chart recorders and round gauge dials. The whole app is navigated with a **minimap of the plant floor** — each room of the minimap is a part of the app.

### 10.2 Colour tokens (CSS variables + Tailwind theme; only these)
| Token | Hex | Use |
|---|---|---|
| `--plate` | `#EEF0F2` | page background (aluminium) |
| `--sheet` | `#FFFFFF` | panels, tables, forms |
| `--graphite` | `#1C1F24` | text, label tape, strokes |
| `--graphite-2` | `#4E5560` | secondary text |
| `--graphite-3` | `#8B929C` | hints, disabled, axes |
| `--line` | `#D5D9DE` | borders, grid lines |
| `--hivis` | `#FF6A13` | primary buttons (with graphite text), active room, alert glow |
| `--hivis-deep` | `#D9500A` | hover/pressed, chart line |
| `--hivis-wash` | `#FFE9D9` | selected rows, soft highlights |
| `--steel` | `#5B6B7C` | healthy state, secondary series |
| `--steel-wash` | `#E6EBF0` | healthy fill, stripes |
| `--series-d` | `#3F7C85` | fourth chart series |
| `--watch` | `#B58100` (text `#7F5A00`) | Watch state |
| `--fault` | `#A8201F` | Critical/Fault, errors |
Rules: primary buttons are **hi-vis orange fill with graphite text** (never white on orange). Machine states: **Healthy** = steel ring + ✓, **Watch** = amber ring + ◐, **Alert** = hi-vis ring + ▲, **Critical** = red ring + ✖ (always icon + word + colour). Chart series: temperature = hivis-deep, vibration = graphite, current = steel, pressure = series-d, speed = graphite-3 dashed. Set `accent-color`, selection and focus ring to `--hivis-deep` (2 px).

### 10.3 Fonts (npm `@fontsource/...`, explicit weights)
- Headlines, label tape, big numbers: **Big Shoulders Display** — `@fontsource/big-shoulders-display` (700, 800)
- UI/body: **Barlow** — `@fontsource/barlow` (400, 500, 600)
- Data, tickers, axes, IDs: **Share Tech Mono** — `@fontsource/share-tech-mono` (400)
- Icons: **Carbon** — `@carbon/icons-react`.
Scale: hero 72 (caps), page title 34 (caps), section 18, body 15, table 13.5, label-tape 11 uppercase tracking .12em. Tabular numerals.

### 10.4 Shape & motion
Radius 4 px. Plates have a 1 px `--line` border and a **label-maker tape** title (black `--graphite` strip, white mono caps, 22 px tall, left-aligned, sits on the top edge). Dials and rings are circular SVG. No heavy shadows. Motion: dial needles ease 400 ms, strip-chart scrolls on live refresh, minimap room pulse on new alarms, number count-up 300 ms; respect `prefers-reduced-motion`.

### 10.5 Global layout — "PLANT MINIMAP" (new)
1. **Header (96 px, light):** left = wordmark "PREDICTMAINT.AI" in Big Shoulders caps (click → Plant Floor); centre = **Context plate** ("LINE 2 › PRESS-04 · DATA TO 18:00 · SYNTHETIC") with machine picker (clicking opens a searchable list); right = bell + avatar, then the **Minimap**, a 176 × 96 px stylised floor-plan in the top-right corner with **7 rooms**: ① Receiving (Data), ② Control Room (Trends), ③ Workshop (Features), ④ Lab (Models), ⑤ Bench (Compare & accuracy), ⑥ Dispatch (Reports), ⑦ Office (Plan & Review, + Admin for admins). The current room is outlined in hi-vis; rooms with open alarms/reviews show a small pulsing dot; hover shows the room name + plain description; click navigates; keys **1–7** jump; ⌘K opens search. Role-hidden rooms are greyed out.
2. **Page canvas:** full-width stack of **plates** (panels with label-tape titles) in 12-column rows of mixed widths; **no sidebar, no tab bar, no tile wall, no bento**. Between plates a thin dotted "conveyor" line is purely decorative (hidden on mobile).
3. **Machine drawer is NOT used.** Machine details are a full page ("Machine Passport", §10.6).
4. **Footer:** thin rule with "Advisory decision support. Inspect before you act." + formula version.
5. Mobile: header shows wordmark + a round map button opening the minimap as a full-screen floor plan; plates stack.

### 10.6 Pages
- **Landing (public):** hero = an interactive **P–F curve** (potential failure → functional failure) drawn as a long line with a bearing-vibration waveform that grows noisier, annotations "Detected here by PredictMaint · 6 days before failure" and "Typical alarm threshold", a draggable marker showing days of warning; below: three plain-language columns (Detect · Predict · Plan), a sample plant minimap, role entry buttons, disclaimer.
- **Login — "Start panel":** a light control panel plate: two engraved input slots "OPERATOR ID" (email) and "PASSCODE" (password, show/hide), a large **round hi-vis START button** (graphite text "START") that depresses on press, a small outlined "RESET" for clearing, forgot-passcode link; first-login passcode change = same panel with "SET NEW PASSCODE"; states: validation (field slot turns red-outlined with message), loading (button ring spins), invalid credentials, lockout countdown, expired session banner as a label-tape strip.
- **Plant Floor (home):** a large **SVG floor plan** (lines as zones, conveyors, machines as icons) where each machine shows a **health ring + risk %**; clicking a machine opens its Passport; a toggle switches colour-by Risk / Health Index / Time since maintenance; below the map two plates: **"Top 5 at risk"** list and **"Today's alarms"**; a small plate with fleet counts as four dial gauges (Healthy, Watch, Alert, Critical).
- **Machine Passport:** header (icon, type, line, criticality, last maintenance); **Strip-chart recorder** plate: stacked sensor strips with a shared time axis, brush, markers for maintenance, failures and alarms, hover value read-out across all strips; **three dials** (Health Index, Failure risk next H h, indicative RUL); **"Why flagged"** plate listing top deviating features with small bars and baseline bands; maintenance history timeline (horizontal); "Open alarm review" button.
- **① Receiving (Data):** page title "RECEIVING". Plates: **Dock** (large drop area drawn as a roller-shutter door; "Download template/sample"), **Inbound log** (upload batches with status stamps), **Quick entry** forms (reading, maintenance event) and **Reading grid**; the upload wizard is a **single "Scan & Fix" screen**: left = raw preview table with problem cells underlined and numbered, right = **fix list** (e.g. "37 gaps → interpolate ≤ 3 steps", "2 °F values → convert", "duplicates → choose policy") each with an Apply button, a **scan banner** summarising pass/warn/fail, and a "Release to database" button. **Machine registry** = tree editor (plant → line → machine → sensors) with drag-free add/edit forms.
- **② Control Room (Trends):** a full-width strip-chart for any machine/sensors, date brush, operating-mode filter; **overlay compare** (machine A vs B); **event-aligned view** ("t-minus days before failure" for all failures, median ± band); distribution and correlation plates; export current view.
- **③ Workshop (Features):** a **horizontal assembly line** of operation blocks (Resample → Clean → Window → Extract → Normalise → Label) each with parameters and a before/after sparkline; below, the **feature table** (name, group, importance, missing %, leakage-check badge) and **baseline health definition** panel; "Build feature set" runs a background job with progress.
- **④ Lab (Models):** a **model rack**: each model is a full-width 1U strip (type icon, name, trained range, PR-AUC, recall, false alarms/month, LED status Draft/Validated/Active/Retired, buttons Train · Validate · Activate · Retire); "New model" opens an inline form strip (family, features, horizon, split, class weights); activation requires a Reliability Engineer's approval note.
- **⑤ Bench (Compare & accuracy):** **scoreboard** table of selected models vs baselines; **PR-curve overlay**; **cost curve with draggable threshold** showing FN/FP counts and total cost; **lead-time histogram**; confusion matrix; per-machine breakdown; **failure replay**: choose a failure and watch each model's risk score over the days before it.
- **⑥ Dispatch (Reports):** **report press**: four large template rows (Machine Health Sheet · Fleet Weekly Briefing · Model Validation Pack · Maintenance Plan), each with a small page thumbnail and its parameters; **Run** → **print queue** table (name, format, status queued/generating/ready/failed, size, download, regenerate).
- **⑦ Office (Plan & Review):** a **month calendar** plate showing planned shutdowns and suggested inspection windows (approve/reschedule buttons) and a **"Alarms awaiting review"** list; clicking an alarm opens a centred **Inspection Form modal**: evidence strip-chart, model "why", a 3-position selector **[False alarm | Needs check | Confirmed fault]**, root-cause dropdown, notes, Save (keys 1/2/3); feedback appears in the training set preview. Admins also get Users, Thresholds & Costs, Audit logs here.

### 10.7 Component list
Minimap, MinimapRoom, ContextPlate, MachinePicker, Plate (label-tape title), LabelTape, PlantFloorMap, MachineIcon, HealthRing, StateBadge (icon+word), DialGauge, StripChartRecorder, EventMarker, DropDock, ScanSummary, FixList, ReadingGrid, MachineTree, AssemblyLine, OperationBlock, FeatureTable, ModelRack, ModelStrip, ScoreboardTable, PRCurve, CostCurve, LeadTimeHistogram, FailureReplay, ReportPress, PrintQueue, PlanCalendar, InspectionFormModal, ThreeWaySelector, StartPanel (login), PFCurveHero, EmptyState, ErrorState, Skeleton, ConfirmDialog, CommandPalette, Toasts.

### 10.8 Accessibility & states
Contrast ≥ 4.5:1 (hi-vis only as fill with graphite text); full keyboard use for minimap rooms (1–7, arrow keys between rooms), strip-chart crosshair (arrow keys), threshold slider, three-way selector; visible 2 px focus ring; every chart has loading/empty/error/populated states and a data-table alternative; status never colour-only; no fake hard-coded metrics outside labelled demo data.

### 10.9 Banned (belongs to my other projects)
Left/right sidebar or vertical rail; tab-box or text-index top navigation; dark top command bar; floating bottom dock; full-screen INDEX overlay; tiling panes / terminal status line; page-title switcher; waffle launcher + breadcrumb; Miller columns; hub-and-spoke home with big destination buttons; three-zone cockpit; masthead + twin view; hanging price tags; shelf strip; right-edge spine tabs; sentence ribbon; sun-arc; numbered gutter bands; vertical ladder steppers; bento tile grids; KPI-card rows; cheque / deposit-slip / receipt / crate-board / candle-backdrop / notebook / book / terminal / HUD / sticker logins; scroll-snap acts; mode carousel; kanban; node graph canvas; filmstrip / outline+preview / block-editor reports; back-issues shelf; accordion pages; email-inbox triage. Fonts: Inter, IBM Plex, Bricolage Grotesque, Figtree, Red Hat Mono, Sora, DM Sans/Mono, Fraunces, Manrope, JetBrains Mono, Space Grotesk, Hanken Grotesk, Spline Sans Mono, Instrument Serif/Sans, Albert Sans, Martian Mono, Josefin Sans, Public Sans, Overpass Mono, Unbounded, Schibsted Grotesk, Azeret Mono, Young Serif, Rethink Sans, Fragment Mono, Gabarito, Onest, Sometype Mono, Syne, Lexend, Chivo Mono, Epilogue, Plus Jakarta Sans, Reddit Mono, Newsreader, Work Sans, Roboto Mono. Icons: Lucide, Phosphor, Tabler, Remix, Heroicons, Hugeicons, Iconoir. Palettes: green/gold farm, glacier/ice blue, transit blue, parchment+terracotta, concrete+safety-yellow, lavender+violet, coral+pastel, ruby, linen+lime, petrol-teal+brass, magenta+sun-orange, cocoa, olive+apricot, wine+silver, denim+peach, black-white broadsheet with cobalt/orange.

## 11. API (base `/api/v1`, typed, role-guarded; errors `{error:{code,message,details[]}}`)
`POST /auth/login|logout|refresh|forgot|reset|change-password` · `GET /auth/me`
`GET/POST/PATCH /lines` · `/machines` · `/sensors` · `/users` · `GET/PUT /config` (thresholds, costs, horizon)
`GET /readings` (machine, sensors, range, resolution) · `POST /readings` · `POST /readings/batch`
`GET/POST/PATCH /maintenance-events`
`GET /uploads/template?kind=` · `GET /uploads/sample` · `POST /uploads/scan` · `POST /uploads/{id}/apply-fixes` · `POST /uploads/{id}/release` · `GET /uploads/{id}/errors.csv`
`GET /trends/events-aligned` · `GET /trends/compare`
`POST /features/build` · `GET /features/{id}` · `GET /features/{id}/table`
`GET/POST /models` · `POST /models/{id}/train|validate|activate|retire` · `GET /models/{id}`
`POST /evaluations` · `GET /evaluations/{id}` · `POST /evaluations/{id}/threshold` (cost sweep) · `GET /evaluations/{id}/replay`
`POST /score/run` · `GET /machines/{id}/passport` · `GET /floor` (map data + states) · `GET /alerts` · `PATCH /alerts/{id}`
`GET /reviews` · `POST /reviews` · `GET/POST/PATCH /plan`
`POST /reports` · `GET /reports/{id}/download` · `GET /audit-logs`
Long jobs (feature build, training, scoring) run as background tasks with progress and cancel.

## 12. PROJECT STRUCTURE (only two root folders)
```
predictmaint/
  backend/  app/{main.py, core/(config,security,errors,logging), api/v1/routers/, schemas/, repositories/, services/,
                 engine/(validation.py, resample.py, features.py, fft.py, health_index.py, labels.py, models.py,
                         anomaly.py, evaluate.py, threshold.py, alarms.py, explain.py, planning.py, quality.py), ingestion/, reports/}
            tests/  scripts/(seed_demo.py, create_indexes.py)  requirements.txt  .env.example  .venv/
  frontend/ src/{app, routes, features/(landing,auth,floor,machine,receiving,control,workshop,lab,bench,dispatch,office,admin),
                 components/(minimap,plate,floor,charts,dials,grid,ui), lib/(api,query,format), styles/, types/}
            package.json  .env.example
  README.md  .gitignore  PROJECT_SPEC_PREDICTMAINT.md
```
Run: `cd backend && uvicorn app.main:app --reload --port 8000` · Tests: `cd backend && pytest` · Frontend: `cd frontend && npm run dev`.

## 13. `.env.example` (placeholders only)
```
# backend/.env.example
APP_ENV=development
MONGODB_URI=<paste-your-atlas-uri-here-locally-only>
MONGODB_DB_NAME=predictmaint
MONGODB_TEST_DB_NAME=predictmaint_test
JWT_SECRET=<generate-a-long-random-string>
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
CORS_ORIGINS=http://localhost:5173
UPLOAD_MAX_MB=25
DEFAULT_HORIZON_HOURS=72
DEFAULT_COST_MISS=50000
DEFAULT_COST_FALSE=2000
DEMO_USER_PASSWORD=<choose-a-local-demo-password>
LOG_LEVEL=INFO
# frontend/.env.example
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 14. TESTING
- **Golden fixtures:** small hand-calculated windows with exact mean, RMS, kurtosis, slope, crest factor; FFT of a synthetic sine gives the right dominant frequency; health index of baseline data ≈ 0.
- **Leakage tests:** no timestamp after the window end influences a feature; split by time and by machine never mixes.
- **Label tests:** failure within H hours labelled correctly; repair periods excluded.
- **Metric tests:** precision/recall/PR-AUC/event-level recall/lead time on hand-made sequences; cost-optimal threshold equals brute-force result.
- Validation catalog (§5.1, §6): gaps, duplicates, flatline, spikes, unit conversion, clock drift, duplicate policies.
- Alarm tests: debounce, cool-down, planned-maintenance suppression.
- API/RBAC (technician cannot read other lines; viewer read-only; activation needs engineer role); report numbers equal dashboard numbers. Test DB isolated; time-series collection creation test.
- Frontend: minimap navigation/keys, scan-and-fix flow, strip-chart crosshair, three-way selector, role-hidden rooms.
- E2E: login → upload readings → scan & fix → build features → train → compare → activate → score → review alarm → PDF.
- Security: rate-limit, cross-role access, malformed files, NoSQL injection, secret redaction.

## 15. RISKS
| Risk | Mitigation |
|---|---|
| Few failures → imbalance | PR-AUC, class weights, event-level metrics, unsupervised baseline, honest confidence statements |
| Data leakage | Time- and machine-grouped validation; leakage tests |
| False alarms erode trust | Debounce, cost-aware threshold, technician feedback loop |
| Sensor faults mistaken for failures | Quality rules, flatline/spike flags, drift traps in tests |
| Over-reliance on model | Advisory wording; activation needs approval; plan items are suggestions |
| Large time-series volume | Time-series collection, bounded batches, pagination, downsampling for charts |
| Exposed DB credentials | `.env` only, rotate if shared, least-privilege Atlas user |

## 16. DELIVERABLES
Working app, README (setup, `.env`, folder structure, demo logins), API docs, seed script, template/sample CSVs, test report, screenshots (1440/1024/390), `frontend/UI_UNIQUENESS_CHECK.md`, user guide, demo script.

---
## 17. CLAUDE CODE PHASE PROMPTS (paste one by one; finish and commit each first)
**Phase 1 — Foundation.** Create `backend/` and `frontend/` only (plus README, .gitignore). Backend: FastAPI app factory, `pydantic-settings` config (fail fast on missing/placeholder `MONGODB_URI`/`JWT_SECRET`), URI-safe logging, error contract, `/health`, `.env.example`, `requirements.txt` with latest verified versions. Frontend: Vite + React 18 + TS + Tailwind + shadcn/ui + router + TanStack Query, `.env.example`. Config fail-fast test.
**Phase 2 — Design system "Plant Minimap".** Tokens (§10.2–10.4), fonts `@fontsource/big-shoulders-display`, `@fontsource/barlow`, `@fontsource/share-tech-mono`, `@carbon/icons-react`; build header with ContextPlate and **Minimap** (7 rooms, keys 1–7, alarm dots), Plate with LabelTape, StateBadge, DialGauge, HealthRing, Skeleton/Empty/Error, ConfirmDialog, CommandPalette; `/design` dev route. No sidebar, tab bar, tile wall or bento.
**Phase 3 — Database layer.** PyMongo connection, repositories for §9 including the **time-series collection** for readings, `create_indexes.py`, role-scoped helpers, test DB fixtures.
**Phase 4 — Auth & roles.** Admin-created users, login/refresh/logout/forgot/reset/first-login change, bcrypt, slowapi, lockout, guards, technician line scoping. Frontend Start-panel login (round START button), passcode-change panel, protected routes, role-aware Minimap.
**Phase 5 — Registry & data entry.** Plants/lines/machines/sensors CRUD, readings and maintenance-event endpoints with validation, Receiving page (Quick entry, Reading grid with paste, Machine tree editor, Inbound log).
**Phase 6 — Upload "Scan & Fix".** Template/sample CSV+XLSX for readings and maintenance history, scan endpoint (all §5.1 rules), fix list with apply-fixes, duplicate policy, idempotent release (SHA-256), rejected-rows CSV; Scan & Fix UI with numbered problem cells.
**Phase 7 — Trend Explorer & Machine Passport.** Resolution-aware readings API, event-aligned and compare endpoints; StripChartRecorder (shared axis, brush, markers), Control Room page, Machine Passport (dials, why-flagged placeholder).
**Phase 8 — Feature engineering.** `resample.py`, `features.py`, `fft.py`, `health_index.py`, `labels.py` with golden and leakage tests; background build job; Workshop assembly-line UI and feature table.
**Phase 9 — Models.** Baselines, control charts, Isolation Forest, PCA/Mahalanobis, Logistic, Random Forest, HistGB; time-based machine-grouped validation; model rack API/UI with train/validate/activate (approval note), versioning.
**Phase 10 — Evaluation & Bench.** All §5.8 metrics, cost sweep and threshold endpoint, lead-time and event-level recall, failure replay; Bench page (scoreboard, PR overlay, draggable cost curve, histogram, confusion matrix, replay).
**Phase 11 — Scoring, alarms, explanations.** Scoring job, debounce/cool-down/severity, alerts API, `explain.py`, Plant Floor map with health rings and toggles, Passport "Why flagged".
**Phase 12 — Planning & review.** Planning engine and calendar, Office page, Inspection Form modal with three-way selector and keys, feedback to training-set preview, audit logs, Admin sections.
**Phase 13 — Reports.** PDF/Excel/CSV (Machine Health Sheet, Fleet Weekly Briefing, Model Validation Pack, Maintenance Plan) from saved ids, Dispatch report press and print queue; numbers match screens.
**Phase 14 — Landing site.** P–F curve hero, plain-language columns, sample minimap, disclaimer.
**Phase 15 — QA & polish.** All test layers, E2E, accessibility, responsive screenshots (mobile minimap map button), security checks, README, `frontend/UI_UNIQUENESS_CHECK.md`, folder check (`ls` at root shows only `backend`, `frontend`, README.md, .gitignore, spec).

---
## 18. REFERENCES (for the report)
Predictive and condition-based maintenance; P–F interval; vibration features (RMS, crest factor, kurtosis, FFT band energy); control charts (Shewhart, EWMA, CUSUM); Isolation Forest; PCA/Mahalanobis health index; precision–recall for imbalanced classes; cost-sensitive thresholding; probability calibration; SHAP/permutation importance; scikit-learn, statsmodels, SciPy, FastAPI, Pydantic, MongoDB time-series collections and React documentation.
