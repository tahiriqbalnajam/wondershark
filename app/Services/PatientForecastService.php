<?php

namespace App\Services;

use App\Models\AiApiResponse;
use App\Models\AiModel;
use App\Models\Brand;
use App\Models\BrandCompetitiveStat;
use App\Models\PatientForecast;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PatientForecastService
{
    /**
     * Fixed AI health-information usage rate from the docx methodology (Step 2).
     * Proportion of potential patients who use AI tools for health information
     * during their research or provider-selection process.
     */
    public const AI_USAGE_RATE = 47;

    /**
     * The AI-researched inputs Steps 1-5 are computed from. They are stored on every
     * forecast row, which is what lets a changed market share be re-applied later
     * without asking the AI again.
     *
     * @var list<string>
     */
    protected const METHODOLOGY_INPUT_KEYS = [
        'annual_procedure_volume',
        'consultation_to_procedure_rate',
        'contact_rate',
        'contact_to_booking_rate',
        'lower_attendance_rate',
        'upper_attendance_rate',
        'lower_consultation_to_patient_rate',
        'upper_consultation_to_patient_rate',
    ];

    /**
     * Compute per-entity market shares for one analysis session using the
     * "old BVI" path: brand_competitive_stats.visibility (override-aware).
     *
     * Market Share_i = (BVI_i / Sum of BVI of all competitors) × 100
     *
     * Returns a map keyed by entity_ref:
     *   'brand'                 => ['visibility' => float, 'market_share' => float, 'competitor_id' => null,  'entity_name' => string]
     *   'competitor:<id>'       => ['visibility' => float, 'market_share' => float, 'competitor_id' => int,   'entity_name' => string]
     */
    public function computeSessionMarketShares(Brand $brand, string $analysisSessionId): array
    {
        // Only include competitor rows whose competitor still exists and is accepted.
        // The brand's own row (competitor_id IS NULL) is always included.
        // Stale BVI rows for deleted/unaccepted competitors are ignored.
        $stats = BrandCompetitiveStat::where('brand_id', $brand->id)
            ->where('analysis_session_id', $analysisSessionId)
            ->where(function ($q) {
                $q->whereNull('competitor_id')
                    ->orWhereHas('competitor', fn ($cq) => $cq->where('status', 'accepted'));
            })
            ->get();

        if ($stats->isEmpty()) {
            return [];
        }

        // Sum of effective visibility across brand + every competitor.
        $bviAll = $stats->sum(fn ($s) => (float) $s->getEffectiveVisibility());

        $map = [];
        foreach ($stats as $stat) {
            $bviEntity = (float) $stat->getEffectiveVisibility();
            $marketShare = $bviAll > 0
                ? round(($bviEntity / $bviAll) * 100, 2)
                : 0.0;

            $entityRef = $stat->competitor_id
                ? "competitor:{$stat->competitor_id}"
                : 'brand';

            $map[$entityRef] = [
                'visibility' => round($bviEntity, 2),
                'market_share' => $marketShare,
                'competitor_id' => $stat->competitor_id,
                'entity_name' => $stat->entity_name,
                'entity_url' => $stat->entity_url,
            ];
        }

        return $map;
    }

    /**
     * Build the batched forecast prompt for one AI call covering all entities.
     *
     * Follows the docx "Calculate an annual patient-acquisition forecast" methodology
     * exactly, with doctor/practice framing. The AI performs all research, assumptions,
     * and scenario analysis internally and returns strict JSON containing only the
     * intermediate figures the backend needs. The backend — not the AI — applies the
     * 47% AI-usage rate (Step 2), the per-entity BVI market share (Step 3), the
     * Step 4/5 math, upward rounding, and the new_patients ≤ booked_consultations
     * invariant.
     */
    public function buildBatchedPrompt(Brand $brand, array $entitiesWithMarketShare): string
    {
        $region = $brand->region_string ?: '[not specified]';
        $procedure = $brand->procedure ?: '[not specified]';

        $entitiesJson = collect($entitiesWithMarketShare)
            ->map(function ($data, $entityRef) {
                return [
                    'entity_ref' => $entityRef,
                    'entity_name' => $data['entity_name'],
                    'normalized_bvi_market_share_pct' => $data['market_share'],
                ];
            })
            ->values()
            ->toJson(JSON_PRETTY_PRINT);

        return <<<PROMPT
You are an expert healthcare-market analyst. Calculate an annual patient-acquisition forecast for a doctor's practice and each competing practice in the same service area, using the methodology below.

Inputs:
- Region: {$region}
- Procedure: {$procedure}
- AI health-information usage rate: 47% (fixed, applied by the backend at Step 2 — do NOT apply it yourself)
- Normalized BVI market share: per-entity, provided below.

Entities (one forecast per entity, returned in the same order):
{$entitiesJson}

Methodology — perform all research, assumptions, and scenario analysis internally. Use optimistic but realistic and defensible assumptions. Do not use extreme, unsupported, or best-case-only assumptions.

Step 1: Estimate Total Annual Consultation Opportunities
- Research the most recent credible public data for the procedure and geographic market. Prioritize: government healthcare data, medical-society procedure statistics, claims or registry data, hospital or health-system data, peer-reviewed research, credible procedure-volume studies, reputable industry reports when stronger sources are unavailable.
- Define the practical geographic market based on how patients realistically seek the procedure (city, metro area, county, state, regional catchment, or another defensible service area).
- Estimate defensive, median, and optimistic scenarios internally; use the credible optimistic scenario in the final figures, provided it remains realistic and supportable.
- When annual procedure volume is available: Total annual consultation opportunities = annual_procedure_volume ÷ consultation_to_procedure_rate. Select a credible optimistic consultation-to-procedure rate based on: elective vs medically necessary care; cosmetic/self-pay/insured/out-of-network status; procedure cost; financing availability; clinical qualification requirements; availability of nonsurgical alternatives; regional competition; referral requirements and patterns; patient willingness to travel; consultation fees; procedure urgency. Do not select an artificially low rate to inflate the result.
- When only prevalence or incidence data are available: adjust for patients actively seeking treatment, clinically eligible, within the realistic service area, likely to consult a specialist, able/willing to pay or obtain coverage, duplicate patients, repeat consultations, and patients choosing nonsurgical or alternative treatments. Do not treat every prevalent or eligible case as a consultation opportunity.

Step 2: Applied by the backend — Annual opportunities using AI = Total × 47%. (Do NOT apply this yourself; the backend will.)

Step 3: Applied by the backend — Annual AI-visible opportunities = Annual opportunities using AI × Normalized BVI market share. (Do NOT apply this yourself; the backend will, using the per-entity normalized_bvi_market_share_pct provided above.)

Step 4: Estimate Booked Consultations
- Estimate defensive, median, and optimistic contact rates and contact-to-booking rates internally. Use credible optimistic rates in the final figures, kept within realistic operating ranges for the procedure, region, and practice type. Consider: strength of patient intent, procedure urgency, medical necessity, self-pay vs insured care, consultation fees, financing availability, practice reputation, regional competition, patient travel requirements, scheduling availability, response speed, lead follow-up quality, referral or medical-record requirements, website and phone conversion quality. Do not assume every AI-visible opportunity contacts the practice or books a consultation.

Step 5: Estimate the Range of New Patients
- A new patient is a booked consultation that (a) attends the consultation and (b) proceeds with the specified procedure or treatment.
- Estimate realistic optimistic ranges for booked-to-attended consultation rate and attended-consultation-to-new-patient conversion rate. Do not use a 100% attendance rate, a 100% closing rate, or unsupported conversion assumptions.
- For elective, cosmetic, and high-cost procedures, account for: price sensitivity, financing approval, patients comparing multiple providers, medical eligibility, scheduling delays, consultation no-shows, patients choosing not to proceed, and patients selecting nonsurgical alternatives.

Calculation rules:
- Use annual results only.
- Use the most recent credible public information available.
- Use optimistic but realistic and defensible assumptions.
- Do not count the same patient more than once.
- Do not treat impressions, searches, or AI mentions as booked consultations.
- Do not treat booked consultations as completed procedures.

Return STRICT JSON ONLY (no markdown fences, no commentary) in this exact shape:
{
  "entities": [
    {
      "entity_ref": "brand" | "competitor:<id>",
      "annual_procedure_volume": <int>,
      "consultation_to_procedure_rate": <float 0-1>,
      "contact_rate": <float 0-1>,
      "contact_to_booking_rate": <float 0-1>,
      "lower_attendance_rate": <float 0-1>,
      "upper_attendance_rate": <float 0-1>,
      "lower_consultation_to_patient_rate": <float 0-1>,
      "upper_consultation_to_patient_rate": <float 0-1>,
      "assumptions": { "notes": "audit-only blob, never shown to the user" }
    }
  ]
}

The backend will apply Steps 2, 3, 4, and 5 math, the 47% rate, the per-entity market share, upward rounding, and the new-patients ≤ booked-consultations invariant. Your job is to return the intermediate figures above per entity, with realistic optimistic values grounded in current credible research for the region and procedure specified.
PROMPT;
    }

    /**
     * Call the AI provider with the batched prompt. Mirrors the pattern in
     * CompetitiveAnalysisService::callAIForAnalysis. Returns [analysis, ai_model_id]
     * or throws on failure.
     */
    public function callAIForBatchedForecast(string $prompt): array
    {
        $aiModel = AiModel::where('is_enabled', true)
            ->orderBy('order', 'asc')
            ->orderBy('id', 'asc')
            ->first();

        if (! $aiModel) {
            throw new \Exception('No enabled AI model found');
        }

        Log::info('Using AI model for patient forecast', [
            'model_name' => $aiModel->name,
            'display_name' => $aiModel->display_name,
            'ai_model_id' => $aiModel->id,
        ]);

        $config = $aiModel->api_config;
        $apiKey = trim($config['api_key'] ?? '');
        $model = $config['model'] ?? 'gpt-3.5-turbo';

        if ($aiModel->name === 'openai') {
            $response = Http::withToken($apiKey)
                ->timeout(180)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    // temperature omitted: gpt-5+/gpt-6+ only support default 1.
                    'max_completion_tokens' => 6000,
                ]);

            if (! $response->successful()) {
                throw new \Exception('OpenAI API error: '.$response->status().' - '.$response->body());
            }

            $content = $response->json()['choices'][0]['message']['content'] ?? '';
        } else {
            throw new \Exception("Unsupported AI model for patient forecast: {$aiModel->name}");
        }

        $jsonMatch = $this->extractJson($content);

        if (! $jsonMatch) {
            Log::error('No JSON found in patient-forecast AI response', ['response' => substr($content, 0, 1000)]);
            throw new \Exception('No JSON found in AI response');
        }

        $parsed = json_decode($jsonMatch, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('Invalid JSON in patient-forecast AI response', [
                'error' => json_last_error_msg(),
                'json' => substr($jsonMatch, 0, 1000),
            ]);
            throw new \Exception('Invalid JSON in AI response: '.json_last_error_msg());
        }

        return [
            'analysis' => $parsed,
            'ai_model_id' => $aiModel->id,
            'raw_response' => $content,
        ];
    }

    /**
     * Apply the docx methodology per entity and return result rows ready for storage.
     *
     * Steps 1-5 from the docx, with 47% (Step 2) and per-entity market share (Step 3)
     * applied server-side. Upward rounding (ceil) for booked_consultations_estimated,
     * new_patients_lower, new_patients_upper. Invariant: new_patients_upper is clamped
     * to ≤ booked_consultations_estimated.
     *
     * @return array<string, array> keyed by entity_ref, each value is a PatientForecast row payload
     */
    public function parseAndComputeAll(array $aiData, Brand $brand, string $analysisSessionId, array $entitiesWithMarketShare): array
    {
        $entitiesList = $aiData['entities'] ?? [];

        if (! is_array($entitiesList) || empty($entitiesList)) {
            throw new \Exception('AI response missing "entities" array');
        }

        // Index AI output by entity_ref for safe lookup.
        $aiByRef = [];
        foreach ($entitiesList as $entity) {
            $ref = $entity['entity_ref'] ?? null;
            if ($ref) {
                $aiByRef[$ref] = $entity;
            }
        }

        $results = [];

        foreach ($entitiesWithMarketShare as $entityRef => $meta) {
            $aiEntity = $aiByRef[$entityRef] ?? null;

            if (! $aiEntity) {
                $results[$entityRef] = $this->failedRowPayload(
                    $brand, $analysisSessionId, $meta,
                    'AI response missing figures for entity '.$entityRef
                );

                continue;
            }

            try {
                $results[$entityRef] = $this->computeEntityRow($aiEntity, $brand, $analysisSessionId, $meta);
            } catch (\Throwable $e) {
                $results[$entityRef] = $this->failedRowPayload(
                    $brand, $analysisSessionId, $meta,
                    'Compute error: '.$e->getMessage()
                );
            }
        }

        return $results;
    }

    /**
     * Apply Steps 1-5 for one entity and return a PatientForecast row payload.
     */
    protected function computeEntityRow(array $aiEntity, Brand $brand, string $analysisSessionId, array $meta): array
    {
        $inputs = [];
        foreach (self::METHODOLOGY_INPUT_KEYS as $key) {
            $inputs[$key] = $this->floatOrThrow($aiEntity, $key);
        }

        $figures = $this->applyMethodology($inputs, (float) $meta['market_share']);

        return [
            'brand_id' => $brand->id,
            'competitor_id' => $meta['competitor_id'],
            'analysis_session_id' => $analysisSessionId,
            'region' => substr($brand->region_string, 0, 100),
            'procedure' => $brand->procedure,
            'visibility' => $meta['visibility'],
            'market_share' => (float) $meta['market_share'],
            'ai_usage_rate' => self::AI_USAGE_RATE,
            'status' => 'completed',
            'booked_consultations_estimated' => $figures['booked'],
            'new_patients_lower' => $figures['lower'],
            'new_patients_upper' => $figures['upper'],
            'assumptions' => $inputs + [
                'ai_assumptions_blob' => $aiEntity['assumptions'] ?? null,
            ],
            'error_message' => null,
        ];
    }

    /**
     * Steps 1-5 from the docx for one entity, given the AI-researched inputs and the
     * entity's market share. Shared by the AI path (computeEntityRow) and by
     * refreshSessionMarketShares(), so a market share that moves after the batch was
     * stored moves the same numbers the same way.
     *
     * @param  array<string, float>  $inputs
     * @return array{booked: int, lower: int, upper: int}
     */
    protected function applyMethodology(array $inputs, float $marketShare): array
    {
        $annualProcedureVolume = (float) $inputs['annual_procedure_volume'];
        $consultationToProcedureRate = (float) $inputs['consultation_to_procedure_rate'];
        $contactRate = (float) $inputs['contact_rate'];
        $contactToBookingRate = (float) $inputs['contact_to_booking_rate'];
        $lowerAttendance = (float) $inputs['lower_attendance_rate'];
        $upperAttendance = (float) $inputs['upper_attendance_rate'];
        $lowerConv = (float) $inputs['lower_consultation_to_patient_rate'];
        $upperConv = (float) $inputs['upper_consultation_to_patient_rate'];

        // Step 1: total annual consultation opportunities
        $totalConsultationOpportunities = $consultationToProcedureRate > 0
            ? $annualProcedureVolume / $consultationToProcedureRate
            : 0.0;

        // Step 2: annual opportunities using AI = total × 47%
        $opportunitiesUsingAi = $totalConsultationOpportunities * (self::AI_USAGE_RATE / 100);

        // Step 3: annual AI-visible opportunities = opportunities_using_ai × market_share
        $aiVisibleOpportunities = $opportunitiesUsingAi * ($marketShare / 100);

        // Step 4: booked consultations = ai_visible × contact_rate × contact_to_booking_rate
        $booked = $aiVisibleOpportunities * $contactRate * $contactToBookingRate;
        $bookedInt = $this->ceilInt($booked);
        if ($bookedInt < 1) {
            $bookedInt = 1;
        }

        // Step 5: new-patient range
        $lower = $bookedInt * $lowerAttendance * $lowerConv;
        $upper = $bookedInt * $upperAttendance * $upperConv;

        $lowerInt = $this->ceilInt($lower);
        $upperInt = $this->ceilInt($upper);

        // Invariant: new-patients ≤ booked consultations.
        if ($upperInt > $bookedInt) {
            $upperInt = $bookedInt;
        }
        if ($lowerInt > $bookedInt) {
            $lowerInt = $bookedInt;
        }
        if ($lowerInt > $upperInt) {
            $lowerInt = $upperInt;
        }

        return ['booked' => $bookedInt, 'lower' => $lowerInt, 'upper' => $upperInt];
    }

    /**
     * Upsert per-entity PatientForecast rows for one session. Existing rows for the
     * same (brand_id, competitor_id, analysis_session_id) are updated; new ones inserted.
     */
    public function storeResults(string $analysisSessionId, array $perEntityResults, int $aiModelId, ?string $rawResponseText, ?string $promptUsed = null): void
    {
        foreach ($perEntityResults as $entityRef => $payload) {
            $forecast = PatientForecast::updateOrCreate(
                [
                    'brand_id' => $payload['brand_id'],
                    'competitor_id' => $payload['competitor_id'],
                    'analysis_session_id' => $analysisSessionId,
                ],
                $payload
            );

            // Attach the raw AI response to this forecast for audit.
            if ($rawResponseText !== null) {
                AiApiResponse::create([
                    'patient_forecast_id' => $forecast->id,
                    'ai_provider' => $this->aiProviderNameFromModelId($aiModelId),
                    'prompt_used' => $promptUsed ?? '',
                    'response_text' => $rawResponseText,
                    'status' => $payload['status'] === 'completed' ? 'completed' : 'failed',
                    'error_message' => $payload['error_message'],
                ]);
            }
        }
    }

    /**
     * Re-apply market share to an already-stored forecast batch after the BVI behind it
     * changed — e.g. an admin set or cleared a manual visibility override.
     *
     * The AI-researched inputs are stored on every row, so the batch is re-derived
     * locally: no AI call, no queue worker, and the researched rates stay exactly as
     * they were — only the market share (and the Steps 3-5 numbers derived from it) move.
     *
     * @return int number of rows actually updated
     */
    public function refreshSessionMarketShares(Brand $brand, string $analysisSessionId): int
    {
        $entities = $this->computeSessionMarketShares($brand, $analysisSessionId);

        if (empty($entities)) {
            return 0;
        }

        $forecasts = PatientForecast::where('brand_id', $brand->id)
            ->where('analysis_session_id', $analysisSessionId)
            ->get();

        return DB::transaction(function () use ($forecasts, $entities) {
            $updated = 0;

            foreach ($forecasts as $forecast) {
                $entityRef = $forecast->competitor_id
                    ? "competitor:{$forecast->competitor_id}"
                    : 'brand';

                // Entity is no longer part of the session (e.g. competitor unaccepted):
                // leave its stored row alone rather than inventing a share for it.
                $meta = $entities[$entityRef] ?? null;
                if ($meta === null) {
                    continue;
                }

                $marketShare = (float) $meta['market_share'];
                $payload = [
                    'visibility' => $meta['visibility'],
                    'market_share' => $marketShare,
                ];

                // Rows without usable inputs (failed rows) keep their null figures; the
                // share itself still follows the visibility it was derived from.
                $inputs = $this->methodologyInputsFromAssumptions($forecast->assumptions);
                if ($inputs !== null) {
                    $figures = $this->applyMethodology($inputs, $marketShare);
                    $payload += [
                        'booked_consultations_estimated' => $figures['booked'],
                        'new_patients_lower' => $figures['lower'],
                        'new_patients_upper' => $figures['upper'],
                    ];
                }

                if (! $this->needsUpdate($forecast, $payload)) {
                    continue;
                }

                $forecast->update($payload);
                $updated++;
            }

            return $updated;
        });
    }

    /**
     * Build display-ready numbers for a stored forecast batch from the visibility
     * values the BVI table is currently showing.
     *
     * Market share is a ratio of the displayed BVI, so it must be re-derived from
     * the same values as the Visibility column — including manual overrides and
     * the selected date range. Using the share frozen at batch-generation time
     * made a row with more visibility show a lower market share (and fewer
     * consultations) whenever the BVI had moved since the batch ran.
     *
     * @param  array<string, float>  $visibilityByEntity  keyed 'brand' or 'competitor:<id>'
     * @return array<string, array<string, mixed>> keyed the same way
     */
    public function displayForecastsFromVisibility(Brand $brand, string $analysisSessionId, array $visibilityByEntity): array
    {
        $forecasts = PatientForecast::where('brand_id', $brand->id)
            ->where('analysis_session_id', $analysisSessionId)
            ->get();

        if ($forecasts->isEmpty() || empty($visibilityByEntity)) {
            return [];
        }

        $totalVisibility = array_sum(array_map(
            fn ($value) => max(0, (float) $value),
            $visibilityByEntity
        ));

        $result = [];

        foreach ($forecasts as $forecast) {
            $entityRef = $forecast->competitor_id
                ? "competitor:{$forecast->competitor_id}"
                : 'brand';

            // Only show metrics for entities the BVI table is currently showing;
            // stale rows for removed/unaccepted competitors are omitted.
            if (! array_key_exists($entityRef, $visibilityByEntity)) {
                continue;
            }

            $visibility = round((float) $visibilityByEntity[$entityRef], 2);
            $marketShare = $totalVisibility > 0
                ? round(($visibility / $totalVisibility) * 100, 2)
                : null;

            $payload = [
                'visibility' => $visibility,
                'market_share' => $marketShare,
                'booked_consultations_estimated' => $forecast->booked_consultations_estimated,
                'new_patients_lower' => $forecast->new_patients_lower,
                'new_patients_upper' => $forecast->new_patients_upper,
                'status' => $forecast->status,
                'region' => $forecast->region,
                'procedure' => $forecast->procedure,
            ];

            // Replay Steps 1-5 locally from the stored AI-researched inputs so
            // consultations and patients follow the new market share without an
            // AI call. Rows without inputs (failed rows) keep their stored figures.
            $inputs = $this->methodologyInputsFromAssumptions($forecast->assumptions);
            if ($inputs !== null && $marketShare !== null) {
                $figures = $this->applyMethodology($inputs, $marketShare);
                $payload['booked_consultations_estimated'] = $figures['booked'];
                $payload['new_patients_lower'] = $figures['lower'];
                $payload['new_patients_upper'] = $figures['upper'];
            }

            $result[$entityRef] = $payload;
        }

        return $result;
    }

    /**
     * Pull the methodology inputs back out of a stored row's assumptions. Returns null
     * when the row has none (failed rows, or rows stored before the inputs were kept).
     *
     * @return array<string, float>|null
     */
    protected function methodologyInputsFromAssumptions(mixed $assumptions): ?array
    {
        if (! is_array($assumptions)) {
            return null;
        }

        $inputs = [];
        foreach (self::METHODOLOGY_INPUT_KEYS as $key) {
            if (! isset($assumptions[$key]) || ! is_numeric($assumptions[$key])) {
                return null;
            }
            $inputs[$key] = (float) $assumptions[$key];
        }

        return $inputs;
    }

    /**
     * True when at least one of the given values differs from what is stored, so a
     * refresh that changes nothing leaves updated_at alone.
     *
     * @param  array<string, mixed>  $payload
     */
    protected function needsUpdate(PatientForecast $forecast, array $payload): bool
    {
        foreach ($payload as $key => $value) {
            $current = $forecast->getAttribute($key);

            if ($value === null ? $current !== null : (float) $current !== (float) $value) {
                return true;
            }
        }

        return false;
    }

    /**
     * Round a non-negative float upward to the next whole number (docx: "round upward").
     * Returns 0 for negative or zero input.
     */
    protected function ceilInt(float $value): int
    {
        if ($value <= 0) {
            return 0;
        }

        return (int) ceil($value);
    }

    protected function floatOrThrow(array $data, string $key): float
    {
        if (! array_key_exists($key, $data) || $data[$key] === null) {
            throw new \Exception("Missing field: {$key}");
        }

        return (float) $data[$key];
    }

    protected function failedRowPayload(Brand $brand, string $analysisSessionId, array $meta, string $errorMessage): array
    {
        return [
            'brand_id' => $brand->id,
            'competitor_id' => $meta['competitor_id'],
            'analysis_session_id' => $analysisSessionId,
            'region' => substr($brand->region_string, 0, 100),
            'procedure' => $brand->procedure,
            'visibility' => $meta['visibility'],
            'market_share' => $meta['market_share'],
            'ai_usage_rate' => self::AI_USAGE_RATE,
            'status' => 'failed',
            'booked_consultations_estimated' => null,
            'new_patients_lower' => null,
            'new_patients_upper' => null,
            'assumptions' => null,
            'error_message' => $errorMessage,
        ];
    }

    protected function extractJson(string $content): ?string
    {
        if (preg_match('/\{.*\}/s', $content, $matches)) {
            return $matches[0];
        }

        $patterns = [
            '/```json\s*(\{.*?\})\s*```/s',
            '/```\s*(\{.*?\})\s*```/s',
            '/(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/s',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $content, $matches)) {
                return $matches[1] ?? $matches[0];
            }
        }

        return null;
    }

    protected function aiProviderNameFromModelId(int $aiModelId): string
    {
        $model = AiModel::find($aiModelId);

        return $model?->name ?? 'unknown';
    }
}
