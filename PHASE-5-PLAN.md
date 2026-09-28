# Phase 5 — Annual Patient-Acquisition Forecast (BVI Table Pivot)

> **Implementation status:** see `PHASE-5-INSTRUCTIONS.md` for the live step-by-step checklist. As of 2026-07-31, Steps 1–10 and 12 are complete (code + migrations + frontend, build run successfully); Step 11 (user smoke test on `wondershark.test`) is pending.

## Goal

Transform the **existing BVI dashboard table** (`resources/js/components/dashboard-table/brand-visibility.tsx`) from its current column set (`#, Brand, Visibility, SOV, Sentiment, Position`) into an **Annual Patient-Acquisition Forecast** table with columns:

`#, Physician, Visibility, Market Share, Estimated Booked Consultations, Estimated Patients Acquired Through AI`

Each row (the brand + every competitor) shows all five metrics. Forecasts are computed in a **single AI call per BVI refresh** that produces figures for all rows at once, batched into the existing `AnalyzeBrandCompetitiveStats` flow. The dashboard reads stored values — no AI call on page load.

The methodology is the one in `C:\Users\Pc\Downloads\Calculate an annual patient.docx`. The fixed **AI health-information usage rate = 47%** is applied at docx Step 2, server-side. Per-entity market share uses `Market Share_i = (BVI_i / Σ BVI of all competitors) × 100`.

## Decisions locked (from clarification rounds)

| # | Decision | Implication |
|---|---|---|
| 1 | Both BVI paths stay in code; **old AI-stat path** (`brand_competitive_stats.visibility`, effective = `visibility_override ?? visibility`) is the source for forecast + market share. Mention-based `getMentionBasedVisibility()` keeps running for the dashboard SOV/visibility graph; the **table** uses the old AI-stat visibility for the Visibility column. | Read from `brand_competitive_stats` per analysis session. |
| 2 | Doctor framing: **column header reads "Physician"**, but the cell shows the **plain brand name** (no "Dr." prefix). | Display-only; no code/DB renames. |
| 3 | All four metrics live on the **dashboard table** (no separate forecast page). | No `forecasts/new.tsx` / `show.tsx` / `index.tsx` pages. |
| 4 | `procedure` is a new column on `brands` (user-supplied on brand create/edit). | Done — migration applied, controller + frontend wired. |
| 5 | **Replace the BVI table columns in place.** Old SOV/Sentiment/Position columns leave this table. | `brand-visibility.tsx` is rewritten; other pages importing it get the new columns automatically. |
| 6 | Forecast numbers computed for **every row** (brand + all competitors), each using its own BVI market share. | Per-entity storage in `patient_forecasts`. |
| 7 | Forecast trigger: **batched with BVI refresh**. One queued job per analysis session makes a single AI call returning figures for all rows. | Hook into `AnalyzeBrandCompetitiveStats`. No "Generate Forecast" button. |

## Inputs (per analysis session)

| Input | Source | Notes |
|---|---|---|
| Region | `$brand->region` | If empty, forecast skips (cells show "—"). |
| Procedure | `$brand->procedure` | If empty, forecast skips (cells show "—"). |
| BVI per entity | `brand_competitive_stats.visibility` (override-aware) for brand + competitors in the session | Drives Visibility column + market-share formula. |
| AI usage rate | Hard-coded `47` | `PatientForecastService::AI_USAGE_RATE`. |

## Per-row outputs (stored)

- `visibility` — decimal 0–100, snapshot from old BVI for this entity/session.
- `market_share` — decimal 0–100, `(entity_BVI / Σ BVI_all) × 100`, rounded to 2 decimals.
- `booked_consultations_estimated` — integer, rounded upward.
- `new_patients_lower` — integer, rounded upward.
- `new_patients_upper` — integer, rounded upward.
- Display format for the "Estimated Patients Acquired Through AI" cell: `LOW to HIGH` (e.g., "23 to 30").
- Display format for "Estimated Booked Consultations" cell: a single integer (e.g., "60").

## Methodology (internal — never shown to user)

The AI returns **per-entity intermediate JSON figures** in one call; the backend applies Steps 1–5 math per entity, the 47% rate, rounding, and the `new_patients_upper ≤ booked_consultations_estimated` invariant.

For each entity *i* (brand + each competitor):

1. Total annual consultation opportunities = `annual_procedure_volume ÷ consultation_to_procedure_rate`.
2. Annual opportunities using AI = `total × 0.47`.
3. Annual AI-visible opportunities = `opportunities_using_ai × (market_share_i / 100)`.
4. Booked consultations estimated = `ai_visible_opportunities × contact_rate × contact_to_booking_rate`. Round upward. Enforce `≥ 1`.
5. New-patient range:
   - Lower = `booked × lower_attendance × lower_conv`
   - Upper = `booked × upper_attendance × upper_conv`
   - Round both upward. Clamp `upper` to `≤ booked_consultations_estimated`.

`annual_procedure_volume`, `consultation_to_procedure_rate`, `contact_rate`, `contact_to_booking_rate`, and the four attendance/conversion rates are returned by the AI **per entity** in one JSON payload. The 47% rate, market-share input, rounding, and invariant are all applied server-side.

## BVI + Market Share computation (backend-only)

`PatientForecastService::computeSessionMarketShares(Brand $brand, string $analysisSessionId): array`

1. Load all `BrandCompetitiveStat` rows for the brand in the given `analysis_session_id`, preferring rows where `visibility_override` is set; effective = `visibility_override ?? visibility`.
2. For each entity: `bvi_entity` = effective visibility.
3. `bvi_all` = sum of effective visibility across brand + every competitor.
4. `market_share_entity = bvi_all > 0 ? (bvi_entity / bvi_all) * 100 : 0` — round to 2 decimals.
5. Return map keyed by entity (brand vs competitor_id) with `[visibility, market_share]`.

If no `BrandCompetitiveStat` rows exist for the session, the forecast job writes a single error row per entity with `status = 'failed'` and `error_message = 'No BVI stats for session'`.

## Schema (revised — per-entity-per-session)

```sql
-- 2026_07_31_000002_create_patient_forecasts_table.php  (REWRITE before applying)
patient_forecasts
  id              BIGINT PK
  brand_id        BIGINT FK → brands (CASCADE)
  competitor_id   BIGINT NULL FK → competitors (CASCADE)  -- NULL = the brand's own row
  analysis_session_id  VARCHAR(255)                       -- matches brand_competitive_stats.analysis_session_id
  region          VARCHAR(100) NULL                       -- snapshot
  procedure       VARCHAR(255) NULL                       -- snapshot
  visibility      DECIMAL(5,2) NULL                       -- snapshot from old BVI
  market_share    DECIMAL(5,2) NULL                       -- computed (entity_BVI / Σ BVI) × 100
  ai_usage_rate   TINYINT DEFAULT 47
  status          ENUM('pending','processing','completed','failed')
  booked_consultations_estimated  INT NULL
  new_patients_lower              INT NULL
  new_patients_upper              INT NULL
  assumptions     JSON NULL                                -- AI intermediate values; audit only
  error_message   TEXT NULL
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
  UNIQUE (brand_id, competitor_id, analysis_session_id)   -- one row per entity per session
  INDEX (brand_id, analysis_session_id)

-- 2026_07_31_000003_add_patient_forecast_id_to_ai_api_responses_table.php  (keep as-is)
ALTER TABLE ai_api_responses ADD COLUMN patient_forecast_id BIGINT NULL
  AFTER industry_analysis_id;
FOREIGN KEY (patient_forecast_id) REFERENCES patient_forecasts(id) ON DELETE CASCADE;
```

## Files to create / change

### Backend

- `app/Models/PatientForecast.php` — Eloquent model; casts for JSON `assumptions`; relations to `brand`, `competitor`.
- `app/Services/PatientForecastService.php` — `AI_USAGE_RATE = 47`; `computeSessionMarketShares(Brand, session)`; `buildBatchedPrompt(Brand, array $entitiesWithMarketShare)`; `parseAndComputeAll(array $aiData, Brand, session)` — applies Steps 1–5 per entity, enforces rounding + invariant.
- `app/Jobs/ProcessPatientForecastBatch.php` — dispatched at the end of `AnalyzeBrandCompetitiveStats` after BVI stats are written. Loads session stats, computes market shares, makes one AI call, stores per-entity result rows.
- Hook in `app/Jobs/AnalyzeBrandCompetitiveStats.php`: after the existing BVI stat write, dispatch `ProcessPatientForecastBatch` if `$brand->procedure` and `$brand->region` are both non-empty.
- `app/Http/Controllers/BrandController.php` `show()`: load the latest `patient_forecasts` rows for the brand (matching the same `analysis_session_id` the competitive stats were rendered from) and pass them to the frontend keyed by entity.
- Migrations as above.

### Frontend

- `resources/js/components/dashboard-table/brand-visibility.tsx` — **rewrite**:
  - Title: "Annual Patient-Acquisition Forecast".
  - Columns: `#, Physician, Visibility, Market Share, Estimated Booked Consultations, Estimated Patients Acquired Through AI`.
  - Physician cell = entity name (brand or competitor) as-is.
  - Visibility cell = `visibility` (with up/down trend arrow + change %, reusing the existing `trends.visibility_*` fields).
  - Market Share cell = `market_share` formatted as `NN%`.
  - Booked Consultations cell = integer, no commas; "—" if null.
  - Patients Through AI cell = `LOW to HIGH`; "—" if null.
  - Sort by visibility desc (rank 1 = highest), same as today.
  - Keep "Show All" button + pin-brand-row behavior.

### Forecast prompt (doctor framing, batched, docx methodology)

The prompt = docx methodology with `[REGION]`, `[PROCEDURE]` substituted, plus a JSON array of entities each with their `[NORMALIZED_BVI_MARKET_SHARE]%`. The AI returns strict JSON: one object per entity with the intermediate figures. Backend applies Steps 1–5 per entity.

```json
{
  "entities": [
    {
      "entity_ref": "brand" | "competitor:<id>",
      "annual_procedure_volume": int,
      "consultation_to_procedure_rate": float,
      "contact_rate": float,
      "contact_to_booking_rate": float,
      "lower_attendance_rate": float,
      "upper_attendance_rate": float,
      "lower_consultation_to_patient_rate": float,
      "upper_consultation_to_patient_rate": float,
      "assumptions": { /* audit-only blob, never rendered */ }
    }
  ]
}
```

The backend maps each `entity_ref` back to the right `patient_forecasts` row (brand_id + competitor_id combination) and applies the math.

## Hard rules

- **Do not run `npm run build` automatically** — user builds manually (per memory `feedback_no_auto_build.md`).
- **Do not** touch `buildCompetitiveAnalysisPrompt`, `CompetitiveAnalysisService`, `CompetitorStatsService`, or the dashboard visibility graph.
- **Do not** rename `brand` → `doctor` anywhere in code/DB/routes. Only the column header text changes to "Physician".
- Enforce server-side: upward rounding of `booked_consultations_estimated`, `new_patients_lower`, `new_patients_upper`; and `new_patients_upper ≤ booked_consultations_estimated`.
- Numbers contain no commas.
- No formulas/sources/assumptions shown in the table — only the five columns.
- If `procedure` or `region` is empty on the brand, the forecast job skips and cells show "—".

## Out of scope

- A separate per-forecast form/page (replaced by the dashboard table).
- Touching `buildCompetitiveAnalysisPrompt` or any competitive-analysis prompt logic.
- Replacing mention-based BVI on the dashboard visibility graph.
- "Generate Forecast" button (batched-with-BVI-refresh instead).
- Admin-wide forecast dashboard.
- Per-competitor procedure overrides (uses the brand's single procedure for all rows in a session).