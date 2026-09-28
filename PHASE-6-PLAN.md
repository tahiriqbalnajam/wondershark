# Phase 6 — Multi-State/Province Region Support for Brands

> **Status as of 2026-08-24:** Implemented and live on both the Brand Edit **and** Brand Create pages. Backend stores region as a JSON-encoded array of `{state, cities: [...]}` rows in the existing `brands.region varchar(255)` column — no DB schema migration. This file documents what shipped, the storage shape, and the known dead code left in `step1-basic-info.tsx`.

## Goal

Allow a brand to specify **one or many** US state / Canadian province + city pairs (e.g. a practice operating in both New York and Texas). Single-state brands continue to look and behave like before. Storage stays in the existing `brands.region varchar(255)` column — **no DB schema migration required** (live DB cannot be changed).

## Storage shape (no DB change)

`brands.region` stays `varchar(255)`. New writes store a JSON-encoded array as a string:

```
[{"state":"New York","cities":["New York","Buffalo"]},{"state":"Texas","cities":["Tetly"]}]
```

Each row is `{state: string, cities: string[]}` — one state/province plus zero or more cities inside it. Existing rows keep working transparently via the accessor:

- `null` / empty → `[]` on read
- JSON-encoded array (new writes) → decoded, each row normalized to `{state, cities: [...]}`
- Legacy `{state, city: "..."}` row → upgraded to `{state, cities: [city]}`
- Legacy `"Delaware, Bellefonte"` string → `[{state: "Delaware", cities: ["Bellefonte"]}]`

The `varchar(255)` cap allows ~5–8 state/city pairs depending on name lengths. Validation caps at `max:5` rows and `max:20` cities per row for safety so users hit a friendly validation error before the DB ceiling.

## What's live now

### Backend (PHP) — fully active

| File | Change |
|---|---|
| `app/Models/Brand.php` | `getRegionAttribute($value)` accessor returns `[{state, cities: [...]}]` array. Handles three storage shapes: null/empty → `[]`, JSON-encoded array (new writes) → decoded, legacy `"State, City"` string → `[{state, cities: [city]}]`. `normalizeRegionRow()` upgrades legacy `{state, city}` rows to `{state, cities: [city]}`. `setRegionAttribute($value)` mutator JSON-encodes arrays on save, stores `null` for empty. `getRegionStringAttribute()` returns joined printable form `"New York, NYC, Buffalo \| Texas, Tetly"` (per row: state then cities, comma-joined; rows joined with ` \| `; empty string when no region). Added to `$appends` so it serializes to Inertia/JSON automatically. |
| `app/Http/Controllers/BrandController.php` | Three validation sites (`store` line 103, `storeStep1` line 228, `update` line 1389): `'region' => 'nullable\|array\|max:5'`, `'region.*.state' => 'required_with:region\|string\|max:100'`, `'region.*.cities' => 'nullable\|array\|max:20'`, `'region.*.cities.*' => 'nullable\|string\|max:100'`. Three persistence sites (lines 154, 248, 1462) filter empty rows: `array_values(array_filter($request->region ?? [], fn($r) => !empty($r['state'])))`. `showCreateStep` line 295 passes `$brand->region` (array) to Inertia unchanged. |
| `app/Services/PatientForecastService.php` | Line 88 uses `$brand->region_string ?: '[not specified]'` for the AI prompt; line 106 interpolates `Region: {$region}`. Lines 344 and 426 snapshot `substr($brand->region_string, 0, 100)` into `patient_forecasts.region varchar(100)`. |
| `app/Services/PostPromptService.php` | Lines 433–434 use `$post->brand?->region_string ?? ''` for `Target Locality` in the prompt. |
| `app/Console/Commands/RunPatientForecast.php` | Lines 40 and 78 use `$brand->region_string` for CLI echo (avoids `Array to string conversion`). `empty($brand->region)` guard at line 37 unchanged — `empty([])` is true. |

### Frontend — Brand Edit page (multi-state enabled)

| File | Change |
|---|---|
| `resources/js/components/region-row-list.tsx` | Reusable `<RegionRowList>` component with add/remove row buttons. `RegionRow` shape is `{state: string, cities: string[]}`. Handles US states, CA provinces, and free-text for other countries. Auto-adds one empty row when switching to a US/CA country with no rows. |
| `resources/js/pages/brands/edit.tsx` | Imports `RegionRowList` (line 23). `Brand.region` and `BrandForm.region` typed as `RegionRow[]`. Removed the four `useState` singles, the `handle*Change` handlers, the `useEffect` sync, and the three render branches. Single `<RegionRowList>` render at line 309. Form init reads `brand.region ?? []`. |
| `resources/js/pages/brands/prompts/index.tsx` | `Brand.region` type changed to `{state, cities: string[]}[] \| null`. CSV export and table cell use `brand.region_string` (auto-serialized from `$appends`). |

### Frontend — Brand Creation page (multi-state enabled)

| File | Current state |
|---|---|
| `resources/js/pages/brands/create/types.ts` | `BrandForm.region: RegionRow[]` (matches backend). `RegionRow` type exported as `{state: string, cities: string[]}`. |
| `resources/js/pages/brands/create/index.tsx` | `existingData.brand.region: RegionRow[]`. Form init `region: existingData.brand?.region ?? []`. Body sends `region: data.region` (array, JSON-serialized automatically). |
| `resources/js/pages/brands/create/step1-basic-info.tsx` | **Multi-state enabled.** `<RegionRowList>` is rendered at line 298 — live, not commented out. The four legacy `useState` declarations (lines 65–68) and `handle*Change` handlers (lines 83–103) are **dead code** — still present but no longer referenced by any rendered JSX. The `useEffect` at line 106 parses saved region into dropdown selections on mount; it is still referenced by the dead handlers but not by `<RegionRowList>`. A large commented-out single-select render block sits above line 298 (the `*/` at line 294 closes it). See "Dead code cleanup" below. |

## Dead code cleanup (optional, future)

`resources/js/pages/brands/create/step1-basic-info.tsx` still carries the old single-select implementation as dead code now that `<RegionRowList>` is rendered. To clean up:

1. Delete the `PHASE-6 ...` comment block at the top (lines 14–28).
2. Delete the four `useState` declarations (`selectedState`, `selectedProvince`, `selectedCity`, `selectedCACity`) — lines 65–68.
3. Delete the derived values `isUS`, `isCanada`, `usCities`, `caCities` (lines 69–72) if no longer referenced.
4. Delete `handleStateChange`, `handleProvinceChange`, `handleUSCityChange`, `handleCACityChange` (lines 83–103).
5. Delete the `useEffect` that parses saved region into dropdown selections (lines 106 onward) — `<RegionRowList>` manages its own state.
6. Delete the commented-out single-select render block (everything between the `{/*` opening and the `*/}` at line 294, including the trailing `}` on line 295).
7. Remove the `usStatesCities`, `canadaProvincesCities`, `useState`, `useEffect` imports if no longer used after the above.

After cleanup the file should contain only: country select, `<RegionRowList>`, procedure input, keywords textarea, and any other remaining step-1 fields.

## How analysis reacts to multi-state

The analysis pipeline runs **once per brand, not per state.** The multi-state region is joined into one string and the AI treats it as a single geographic market:

- `PatientForecastService::buildBatchedPrompt` (lines 88, 106) — AI prompt reads `Region: New York, NYC, Buffalo | Texas, Tetly`. The AI decides how to interpret (sum volumes, pick dominant market, or average). One AI call, one forecast per entity.
- `patient_forecasts.region` snapshot — truncated to 100 chars via `substr($brand->region_string, 0, 100)`.
- `PostPromptService::buildPostPrompt` (lines 433–434) — `Target Locality: {country} {region_string}`. Questions get broader geography.
- Skip guards `empty($brand->region)` in `ProcessPatientForecastBatch.php`, `RunCompetitiveAnalysis.php`, `RunPatientForecast.php:37` — all still work because `empty([])` is true.

**Known limitation:** the forecast returns one combined number, not per-state. If per-state forecasts are needed later, that's a bigger piece of work (loop forecast per state, store one row per (brand × state × entity)).

## Verification

1. Build: `npm run build` (user runs manually per their preference — do NOT auto-build).
2. Create flow: `/brands/create` → Step 1 → pick US → state dropdown appears → pick state + city → click "Add state" → second row appears → fill it → submit. Verify the saved brand has both rows in `region`.
3. Edit flow: `/brands/{id}/edit` → existing brand's region renders as rows. Add a second state, save, reload — rows persist.
4. Non-US/CA: pick "Other" country → free-text rows appear, add/remove works.
5. Prompts table at `/brands/{id}/prompts` shows `Region: New York, NYC, Buffalo | Texas, Tetly` (no `Array` text, no crash).
6. `php artisan tinker --execute="echo Brand::find(131)->region_string;"` returns `Delaware, Bellefonte` for legacy rows.

## What was intentionally NOT done

- **No DB schema migration.** The `brands.region` column stays `varchar(255)` — live DB cannot be changed. JSON is stored as a string in the varchar column; the `Brand` model's accessor/mutator handles encode/decode.
- **No per-state forecast loop.** The analysis pipeline runs once per brand with a joined region string. Per-state forecasts would require looping `buildBatchedPrompt` per state and storing one row per (brand × state × entity) in `patient_forecasts`.
- **No automatic `npm run build`.** Per user preference, the build is run manually.
- **No dead-code cleanup on the create page.** The old single-select `useState` handlers and the commented-out render block are left in `step1-basic-info.tsx` as harmless dead code. `<RegionRowList>` is what's actually rendered. Cleanup is optional and documented above.

## Hard rules

- **Do not run `npm run build` automatically** — user builds manually.
- **Do not** add a new schema migration for `brands.region` — the varchar column holds JSON strings via the accessor/mutator.
- **Do not** change the `patient_forecasts` schema — per-state forecasts are out of scope.
- **Do not** touch `CompetitiveAnalysisService.php` — it does not consume `region`.
- **Do not** introduce a new npm dependency for the multi-select UI — `region-row-list.tsx` already exists and uses only shadcn primitives.

## Resume protocol for a new session

1. Read this file end-to-end.
2. Read `PHASE-5-PLAN.md` and `PHASE-5-INSTRUCTIONS.md` for the forecast pipeline context Phase 6 sits on.
3. Run `git status` to see what's currently modified.
4. Phase 6 is shipped — no active work unless the user explicitly asks for dead-code cleanup or per-state forecasts.
5. Never auto-run `npm run build`.