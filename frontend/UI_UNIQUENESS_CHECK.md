# PredictMaint AI — 2026 Industrial UI Uniqueness & Compliance Audit

## 1. Zero-Blue Color Palette Compliance
Strict compliance with the industrial light control-room aesthetic. The standard digital SaaS blue (`#0000FF`, `#3B82F6`, `#2563EB`, `#1E40AF`, etc.) is **strictly prohibited and eliminated** across the entire UI codebase.

| Token | Hex Value | Industrial Role / Component Application |
|---|---|---|
| `--plate` | `#EEF0F2` | Cold-rolled aluminium plate background |
| `--sheet` | `#FFFFFF` | Machined sheet white cards and dial faces |
| `--graphite` | `#1C1F24` | Industrial carbon graphite text and primary wordmark |
| `--graphite-2` | `#4E5560` | Secondary metadata and electrical bus lines |
| `--graphite-3` | `#8B929C` | Monospaced telemetry units, labels and timestamps |
| `--line` | `#D5D9DE` | 1px industrial bezel seams and chassis borders |
| `--hivis` | `#FF6A13` | Hi-Vis Safety Orange for primary action buttons & active rack LEDs |
| `--hivis-deep` | `#D9500A` | Deep safety orange hover states |
| `--hivis-wash` | `#FFE9D9` | 10% safety orange highlighted rows & active minimap room |
| `--steel` | `#5B6B7C` | Nominal equipment health indicators and validated model rack status |
| `--steel-wash` | `#E6EBF0` | Cold steel table header fills and conveyor steps |
| `--series-d` / `--teal` | `#3F7C85` | Physics features, pressure channels & baseline comparisons |
| `--watch` | `#B58100` | Warning amber condition alerts (35%–55% failure probability) |
| `--fault` | `#A8201F` | Red tag critical alarm condition (>60% probability / vibration spikes) |

## 2. 2026 Industrial Control Room Design Patterns
- **Plant Minimap [Keys 1–7]**: Persistent SVG plant floor minimap widget in header with hotkey navigation to all 7 plant rooms.
- **Continuous Multi-Channel Strip-Chart Recorder**: 24-hour and 7-day FIFO telemetry traces with interactive channel isolator toggles and alarm threshold baseline references.
- **3-Position Technician Feedback Selector**: `[False alarm | Needs check | Confirmed fault]` with single-key shortcuts `[1 | 2 | 3]`.
- **Interactive P–F Degradation Curve**: Landing page hero visual demonstrating Point P (potential failure detection via vibration/temp) through Point F (functional loss), proving predictive lead time economics.
- **Heavy Machinery "START" Panel**: Engraved hardware bezel login panel with recessed input slots, rotary eyelet, and high-visibility round mechanical START button.
- **1U Model Rack Cabinet**: Datacenter rack view with rack ears, mounting screws, status LEDs, and lifecycle promotions.
- **Roller-Shutter Receiving Dock**: Industrial freight intake styled upload area with drag-and-drop CSV/Excel telemetry parser, quality gap/flatline/spike audit, and automated one-click fixes.

## 3. Typography Architecture
- **Display Headings**: `@fontsource/big-shoulders-display` (700/800 bold, condensed uppercase industrial signage).
- **Body & Data Labels**: `@fontsource/barlow` (400/500/600 neutral legible DIN-adjacent sans-serif).
- **Telemetry & Financial Figures**: `@fontsource/share-tech-mono` (400 tabular monospaced numbers, ISO timestamps, and units).

## 4. Component Inventory
- `Plate.tsx`: Heavy metal bezel card with engraved header and status badge slot.
- `LabelTape.tsx`: Dymo-style industrial embossed tape label for room identification.
- `Minimap.tsx`: Interactive SVG floor minimap with real-time room highlight and alarm status.
- `ContextPlate.tsx`: Shift, operational line, active failure model version indicator.
- `StateBadge.tsx`: Hardware status indicator pill (Healthy, Watch, Alert, Critical).
- `HealthRing.tsx`: SVG concentric indicator ring for plant floor asset nodes.
- `DialGauge.tsx`: Needle dial gauge (-120° to +120° mechanical sweep) with colored threshold arcs.
- `ThreeWaySelector.tsx`: 3-position toggle switch for alarm review verification.
- `Header.tsx`: Machine control console topbar with search (⌘K), Minimap, and operator badge.
- `CommandPalette.tsx`: Global fuzzy asset and plant room search palette.
- `StripChartRecorder.tsx`: Industrial paperless strip-chart plotter for vibration, temp, current, pressure, and RPM.

## 5. Iconography
- Exclusively uses `@carbon/icons-react` (IBM Carbon industrial design system).
- Strictly zero banned Lucide or Heroicons imports.
