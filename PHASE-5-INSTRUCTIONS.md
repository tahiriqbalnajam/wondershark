# Phase 5 — Implementation Instructions (resume file) — BVI Table Pivot

Read this file first, then continue from **Progress** below. The full design lives in `PHASE-5-PLAN.md`; this file is the operational checklist.

## What we are building

Transform the **existing BVI dashboard table** (`resources/js/components/dashboard-table/brand-visibility.tsx`) into an **Annual Patient-Acquisition Forecast** table with columns:

`#, Physician, Visibility, Market Share, Estimated Booked Consultations, Estimated Patients Acquired Through AI`

Each row (brand + every competitor) shows all five metrics. Forecasts are computed in **one AI call per BVI refresh** that produces figures for all rows at once, batched into the existing `AnalyzeBrandCompetitiveStats` flow. Dashboard reads stored values — no AI call on page load.

Methodology: `C:\Users\Pc\Downloads\Calculate an annual patient.docx` (extracted text at `C:\Users\Pc\Downloads\doc_text.txt`). Fixed **AI usage rate = 47%** applied at docx Step 2, server-side. Per-entity market share: `Market Share_i = (BVI_i / Σ BVI of all competitors) × 100`.

Mockup reference: `C:\Users\Pc\Desktop\Annual_Patient_Acquisition_Forecast.docx` (extracted text at `C:\Users\Pc\Desktop\annual_forecast.txt`).

## Decisions locked (do not re-litigate)

1. **BVI source**: old AI-stat path (`brand_competitive_stats.visibility`, effective = `visibility_override ?? visibility`) feeds the Visibility column + market-share formula. Mention-based `getMentionBasedVisibility()` keeps running for the dashboard graph and is **not** touched.
2. **Physician column**: header reads "Physician", cell shows the **plain brand name** (no "Dr." prefix). Code/DB/routes stay named "brand".
3. **No separate forecast page**. All five metrics live on the existing dashboard table.
4. **`procedure` column on `brands`** (user-supplied on brand create/edit). Forecast uses brand's procedure; if empty, cells show "—".
5. **Replace BVI table columns in place.** Old SOV/Sentiment/Position columns leave this table. Table title → "Annual Patient-Acquisition Forecast".
6. **Forecast computed for every row** (brand + all competitors), each using its own BVI market share.
7. **Forecast trigger: batched with BVI refresh.** One queued job per analysis session, one AI call returning figures for all rows. Hook into `AnalyzeBrandCompetitiveStats`. No "Generate Forecast" button.

## Hard rules

- **Do not run `npm run build` automatically** — user builds manually (per memory `feedback_no_auto_build.md`). Stop at "frontend written"; tell the user to run it.
- **Do not** touch `buildCompetitiveAnalysisPrompt`, `CompetitiveAnalysisService`, `CompetitorStatsService`, or the dashboard visibility graph.
- **Do not** rename `brand` → `doctor` anywhere in code/DB/routes. Only the column header text changes to "Physician".
- Enforce server-side: upward rounding of `booked_consultations_estimated`, `new_patients_lower`, `new_patients_upper`; and `new_patients_upper ≤ booked_consultations_estimated`.
- Numbers contain no commas.
- No formulas/sources/assumptions shown in the table — only the five columns.
- If `procedure` or `region` is empty on the brand, the forecast job skips and cells show "—".

## Docx methodology (internal only — never shown)

For each entity *i* (brand + each competitor):

1. Total annual consultation opportunities = `annual_procedure_volume ÷ consultation_to_procedure_rate`.
2. Annual opportunities using AI = `total × 0.47`.
3. Annual AI-visible opportunities = `opportunities_using_ai × (market_share_i / 100)`.
4. Booked consultations estimated = `ai_visible_opportunities × contact_rate × contact_to_booking_rate`. Round upward. Enforce `≥ 1`.
5. New-patient range: `booked × lower_attendance × lower_conv` (lower), `booked × upper_attendance × upper_conv` (upper). Round both upward. Clamp `upper` to `≤ booked_consultations_estimated`.

The AI returns **per-entity intermediate JSON figures** in one call; the backend applies Steps 1–5 per entity, the 47% rate, rounding, and the invariant.

## BVI + Market Share computation (backend-only)

`PatientForecastService::computeSessionMarketShares(Brand $brand, string $analysisSessionId): array`

1. Load all `BrandCompetitiveStat` rows for `$brand->id` and `$analysisSessionId`, preferring rows where `visibility_override` is set; effective = `visibility_override ?? visibility`.
2. For each entity: `bvi_entity` = effective visibility.
3. `bvi_all` = sum of effective visibility across brand + every competitor.
4. `market_share_entity = bvi_all > 0 ? (bvi_entity / bvi_all) * 100 : 0` — round to 2 decimals.
5. Return map keyed by `['brand']` and `['competitor:' . $competitor_id]` with `[visibility, market_share]`.

If no `BrandCompetitiveStat` rows exist for the session, the forecast job writes a single error row per entity with `status = 'failed'`, `error_message = 'No BVI stats for session'`.

## AI prompt shape (for Step 6 — batched, doctor framing, docx methodology)

Prompt = docx methodology with `[REGION]`, `[PROCEDURE]` substituted, plus a JSON array of entities each with their `[NORMALIZED_BVI_MARKET_SHARE]%`. AI returns strict JSON: one object per entity with intermediate figures.

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

Backend maps each `entity_ref` back to the right `patient_forecasts` row (brand_id + competitor_id combination) and applies Steps 1–5 math, 47% rate, rounding, invariant. `assumptions` is stored on `patient_forecasts.assumptions` for audit only — **never** rendered in the UI.

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

## Step-by-step task list

Mark `[x]` when done, `[~]` if started but blocked, `[!]` if blocked with a note.

- [x] **Step 1** — Migration `2026_07_31_000001_add_procedure_to_brands_table.php` (adds nullable `procedure` VARCHAR(255) after `region` on `brands`). Applied successfully.
- [x] **Step 2** — Wired `procedure` into `Brand` model `$fillable` and all `BrandController` store/update/draft-create/showCreateStep paths. `Brand::show` passes the full `$brand` model so `procedure` is auto-serialized. Syntax linted clean.
- [x] **Step 2b** — Frontend `procedure` field on brand create Step 1 (`create/step1-basic-info.tsx`, `create/types.ts`, `create/index.tsx` initial state + step1 POST body) and brand edit (`edit.tsx` type, initial state, field). Label: "Procedure". User has run `npm run build` and confirmed.
- [x] **Step 3** — Migrations for `patient_forecasts` + `ai_api_responses` FK. `2026_07_31_000002_create_patient_forecasts_table.php` rewritten to the per-entity-per-session shape (brand_id, competitor_id nullable, analysis_session_id, region, procedure, visibility, market_share, ai_usage_rate, status, booked_consultations_estimated, new_patients_lower, new_patients_upper, assumptions, error_message, timestamps; UNIQUE(brand_id, competitor_id, analysis_session_id); FKs to brands + competitors). `2026_07_31_000003_add_patient_forecast_id_to_ai_api_responses_table.php` adds nullable `patient_forecast_id` + FK + index. Both applied by path (`php artisan migrate --path=... --force`). Verified: `patient_forecasts` table exists, `ai_api_responses.patient_forecast_id` column exists.
- [x] **Step 4** — (merged into Step 3 above) Migration rewrite + apply done.
- [x] **Step 5** — Created `app/Models/PatientForecast.php`: `$fillable` for all columns, `$casts` (assumptions → array, visibility/market_share → decimal:2, ai_usage_rate/booked_consultations_estimated/new_patients_lower/new_patients_upper → integer), `brand()` + `competitor()` relations, `isBrandRow()` / `isCompleted()` / `isFailed()` helpers. Lint clean.
- [x] **Step 6** — Created `app/Services/PatientForecastService.php`. Implements the docx methodology exactly:
  - `AI_USAGE_RATE = 47` constant (Step 2, applied server-side).
  - `computeSessionMarketShares(Brand, session)` — loads `BrandCompetitiveStat` rows for the session, applies `getEffectiveVisibility()` (override-aware), computes `market_share_i = (bvi_i / Σ bvi) × 100` per entity; returns map keyed by `'brand'` / `'competitor:<id>'`.
  - `buildBatchedPrompt(Brand, entities)` — docx methodology verbatim with doctor framing, `[REGION]`/`[PROCEDURE]` substituted, per-entity `normalized_bvi_market_share_pct` JSON, strict-JSON return instruction. Explicitly tells the AI NOT to apply the 47% rate or market share (backend does that).
  - `callAIForBatchedPrompt(prompt)` — clones the `CompetitiveAnalysisService::callAIForAnalysis` pattern (OpenAI chat completion, JSON extraction with multiple fallback patterns).
  - `parseAndComputeAll(aiData, Brand, session, entities)` — applies Steps 1–5 per entity: Step 1 = `volume / conv_rate`; Step 2 = `× 0.47`; Step 3 = `× market_share/100`; Step 4 = `× contact_rate × contact_to_booking_rate` (ceil, min 1); Step 5 lower/upper = `booked × attendance × conv` (ceil), with `upper` clamped to ≤ `booked` and `lower` clamped to ≤ `upper`. Failed entities get a `failed` row with error_message.
  - `storeResults(session, perEntityResults, aiModelId, rawResponse, prompt)` — upserts `PatientForecast` rows via `updateOrCreate` on `(brand_id, competitor_id, analysis_session_id)` and writes one audit `AiApiResponse` per entity with `patient_forecast_id`.
  - Lint clean.
- [x] **Step 7** — Created `app/Jobs/ProcessPatientForecastBatch.php`. Takes `(Brand, string $analysisSessionId)`. Skips silently if `procedure`/`region` empty or no BVI stats for session. Mirrors `AnalyzeBrandCompetitiveStats` trial/subscription guard. Calls `PatientForecastService::computeSessionMarketShares` → `buildBatchedPrompt` → `callAIForBatchedForecast` → `parseAndComputeAll` → `storeResults`. `$timeout = 300`, `$tries = 2`, `failed()` logs permanently. Lint clean.
- [x] **Step 8** — Hooked `ProcessPatientForecastBatch` into `app/Jobs/AnalyzeBrandCompetitiveStats.php`. Generates `$competitiveSessionId = Str::uuid()->toString()` upfront, passes it to `analyzeBrandCompetitiveStats($brand, $competitiveSessionId)`, then dispatches `ProcessPatientForecastBatch::dispatch($brand, $competitiveSessionId)` on the default queue. Lint clean.
- [x] **Step 9** — Updated `app/Http/Controllers/BrandController.php`. Added `loadLatestPatientForecasts(Brand)` helper that picks the most recent `analysis_session_id` from `patient_forecasts` and returns the rows keyed by `'brand'` / `'competitor:<id>'` with `visibility`, `market_share`, `booked_consultations_estimated`, `new_patients_lower`, `new_patients_upper`, `status`, `region`, `procedure`. Wired into `show()` (passes `patientForecasts` to `brands/show`) and `ranking()` (passes `patientForecasts` to `brands/ranking`). Lint clean.
- [x] **Step 10** — Rewrote `resources/js/components/dashboard-table/brand-visibility.tsx`:
  - Title updated on host pages: `show.tsx` card title → "Annual Patient-Acquisition Forecast"; `ranking.tsx` card title → "Annual Patient-Acquisition Forecast - All Competitors".
  - Columns: `#, Physician, Visibility, Market Share, Estimated Booked Consultations, Estimated Patients Acquired Through AI`.
  - Exported `PatientForecastSummary` interface; component accepts `patientForecasts?: Record<string, PatientForecastSummary>`.
  - Physician cell = entity name as-is (no "Dr." prefix).
  - Visibility cell = forecast visibility (falls back to mention-based `stat.visibility` when no forecast); trend arrow + change % reused from existing `trends.visibility_*`.
  - Market Share cell = `Math.round(market_share)` + `%`; "—" if null.
  - Booked Consultations cell = integer with no commas; "—" if null.
  - Patients Through AI cell = `LOW to HIGH`; "—" if either null.
  - Kept sort-by-visibility-desc, "Show All" / "Show all brands" buttons, pin-brand-row behavior, hover color dot, logo + name rendering.
  - Wired `patientForecasts` prop through `show.tsx` and `ranking.tsx` (both pages now pass it to the component). `ranking.tsx` local `CompetitiveStat` interface extended with `sov`/`sov_percentage`/`competitor_id` to match the component's type; `HeadingSmall` usage fixed to use `title` prop. Lint clean.
  - TypeScript: no errors in any Phase-5-touched file (verified with `npx tsc --noEmit --skipLibCheck`). Remaining TS errors in the repo are all pre-existing (`step2-prompts copy.tsx`, `step2-prompts.tsx`, `step3-competitors-03-10-2025.tsx`, `app-sidebar`, `add-prompt-dialog`, `subscribe-popup`, `slider`, `admin/*`, `posts/index`, `welcome`) and unrelated to this phase.
- [~] **Step 11** — User runs `npm run build` manually. Smoke test on `wondershark.test`.
  - **Build:** done — `npm run build` ran successfully (`✓ built in 21.46s`) after Step 10. Frontend artifacts in `public/build/`.
  - **Smoke test:** PENDING. Pick a brand with `BrandCompetitiveStat` rows + `procedure` + `region` set; trigger a BVI refresh (existing flow); run the queue worker (`php artisan queue:work`); watch logs for `Patient forecast batch completed`; refresh the brand dashboard; verify all five columns render per row, no commas in numbers, `new_patients_upper ≤ booked_consultations_estimated`, and "—" appears when `procedure`/`region` empty.
- [x] **Step 12** — Rule honored: no auto `npm run build`.

## Where things live (cheat sheet)

- Plan (full design): `PHASE-5-PLAN.md`
- Source docx methodology: `C:\Users\Pc\Downloads\Calculate an annual patient.docx` (extracted text at `C:\Users\Pc\Downloads\doc_text.txt`)
- Mockup docx: `C:\Users\Pc\Desktop\Annual_Patient_Acquisition_Forecast.docx` (extracted text at `C:\Users\Pc\Desktop\annual_forecast.txt`)
- Old BVI source: `app/Models/BrandCompetitiveStat.php` (column `visibility` + `visibility_override`); rows keyed by `analysis_session_id`
- Async pattern to clone: `app/Jobs/ProcessIndustryAnalysis.php` + `app/Models/IndustryAnalysis.php`
- BVI refresh job to hook into: `app/Jobs/AnalyzeBrandCompetitiveStats.php`
- Table component to rewrite: `resources/js/components/dashboard-table/brand-visibility.tsx`
- Table is imported by: `resources/js/pages/brands/show.tsx`, `resources/js/pages/brands/ranking.tsx`
- Existing AI model selection: `AiModel::enabled()->ordered()->get()` (see `app/Services/CompetitiveAnalysisService.php` lines 185–188)

## Resume protocol for a new session

1. Read this file end-to-end.
2. Read `PHASE-5-PLAN.md` for any detail not covered above.
3. Run `git status` and `php artisan migrate:status` to confirm current DB state.
4. Find the first unchecked `[ ]` step above; if the previous step is `[~]` (blocked), resolve the blocker first.
5. Confirm with the user before any destructive op (rollback, fresh migrate, force push, etc.).
6. Never auto-run `npm run build`.