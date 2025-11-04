<?php

namespace App\Services;

use App\Models\AiModel;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class AiModelDistributionService
{
    /**
     * Distribution strategies
     */
    const STRATEGY_ROUND_ROBIN = 'round_robin';
    const STRATEGY_WEIGHTED = 'weighted';
    const STRATEGY_RANDOM = 'random';
    const STRATEGY_PERFORMANCE_BASED = 'performance_based';

    /**
     * Get next AI model to use based on distribution strategy
     * 
     * @param string $strategy Distribution strategy
     * @param string|null $sessionId Session ID for tracking
     * @return AiModel|null
     */
    public function getNextModel(string $strategy = self::STRATEGY_WEIGHTED, ?string $sessionId = null): ?AiModel
    {
        $enabledModels = AiModel::enabled()->ordered()->get();

        if ($enabledModels->isEmpty()) {
            Log::warning('No enabled AI models found');
            return null;
        }

        switch ($strategy) {
            case self::STRATEGY_ROUND_ROBIN:
                return $this->getRoundRobinModel($enabledModels, $sessionId);
            
            case self::STRATEGY_WEIGHTED:
                return $this->getWeightedModel($enabledModels, $sessionId);
            
            case self::STRATEGY_RANDOM:
                return $this->getRandomModel($enabledModels);
            
            case self::STRATEGY_PERFORMANCE_BASED:
                return $this->getPerformanceBasedModel($enabledModels);
            
            default:
                return $this->getWeightedModel($enabledModels, $sessionId);
        }
    }

    /**
     * Round-robin: Rotate through models equally
     */
    protected function getRoundRobinModel($models, ?string $sessionId): ?AiModel
    {
        $cacheKey = "ai_model_round_robin_index";
        $currentIndex = Cache::get($cacheKey, 0);
        
        $model = $models[$currentIndex % $models->count()];
        
        // Increment for next call
        Cache::put($cacheKey, $currentIndex + 1, now()->addHours(24));
        
        Log::info('Round-robin model selection', [
            'model' => $model->name,
            'index' => $currentIndex,
            'total_models' => $models->count()
        ]);
        
        return $model;
    }

    /**
     * Weighted: Distribute based on model weights/priorities
     * Higher order = higher priority
     */
    protected function getWeightedModel($models, ?string $sessionId): ?AiModel
    {
        // Calculate weights based on order (higher order = more weight)
        $weights = [];
        $totalWeight = 0;
        
        foreach ($models as $model) {
            // Use order as weight, default to 1 if not set
            $weight = $model->order ?? 1;
            $weights[$model->id] = $weight;
            $totalWeight += $weight;
        }

        // Get usage counts for this session
        $sessionUsage = Cache::get("ai_model_usage_{$sessionId}", []);
        
        // Calculate current distribution vs desired distribution
        $bestModel = null;
        $lowestRatio = PHP_FLOAT_MAX;
        
        foreach ($models as $model) {
            $desiredRatio = $weights[$model->id] / $totalWeight;
            $currentUsage = $sessionUsage[$model->id] ?? 0;
            $totalUsage = array_sum($sessionUsage) ?: 1;
            $currentRatio = $currentUsage / $totalUsage;
            
            // Find model that is most under-utilized relative to its weight
            $utilizationGap = $currentRatio - $desiredRatio;
            
            if ($utilizationGap < $lowestRatio) {
                $lowestRatio = $utilizationGap;
                $bestModel = $model;
            }
        }
        
        // Update usage tracking
        if ($bestModel && $sessionId) {
            $sessionUsage[$bestModel->id] = ($sessionUsage[$bestModel->id] ?? 0) + 1;
            Cache::put("ai_model_usage_{$sessionId}", $sessionUsage, now()->addHours(24));
        }
        
        Log::info('Weighted model selection', [
            'model' => $bestModel->name,
            'weight' => $weights[$bestModel->id],
            'current_usage' => $sessionUsage[$bestModel->id] ?? 0,
            'utilization_gap' => $lowestRatio
        ]);
        
        return $bestModel;
    }

    /**
     * Random: Completely random selection
     */
    protected function getRandomModel($models): ?AiModel
    {
        $model = $models->random();
        
        Log::info('Random model selection', [
            'model' => $model->name,
            'total_models' => $models->count()
        ]);
        
        return $model;
    }

    /**
     * Performance-based: Use faster/more reliable models more often
     * This would require tracking success rates and response times
     */
    protected function getPerformanceBasedModel($models): ?AiModel
    {
        // Get performance metrics from cache
        $performanceMetrics = Cache::get('ai_model_performance_metrics', []);
        
        $bestModel = null;
        $bestScore = 0;
        
        foreach ($models as $model) {
            $metrics = $performanceMetrics[$model->id] ?? [
                'success_rate' => 1.0,
                'avg_response_time' => 5.0
            ];
            
            // Score = success_rate * (10 / avg_response_time)
            // Higher success rate and lower response time = better score
            $score = $metrics['success_rate'] * (10 / max($metrics['avg_response_time'], 1));
            
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestModel = $model;
            }
        }
        
        Log::info('Performance-based model selection', [
            'model' => $bestModel->name,
            'score' => $bestScore
        ]);
        
        return $bestModel ?: $models->first();
    }

    /**
     * Distribute models across multiple prompts
     * Returns array of [prompt_index => model_name]
     */
    public function distributeModelsForPrompts(int $promptCount, string $strategy = self::STRATEGY_WEIGHTED, ?string $sessionId = null): array
    {
        $distribution = [];
        
        for ($i = 0; $i < $promptCount; $i++) {
            $model = $this->getNextModel($strategy, $sessionId);
            if ($model) {
                $distribution[$i] = $model->name;
            }
        }
        
        Log::info('Distributed models for prompts', [
            'prompt_count' => $promptCount,
            'strategy' => $strategy,
            'distribution' => array_count_values($distribution)
        ]);
        
        return $distribution;
    }

    /**
     * Update performance metrics for a model
     */
    public function updatePerformanceMetrics(string $modelName, bool $success, float $responseTime): void
    {
        $model = AiModel::where('name', $modelName)->first();
        if (!$model) {
            return;
        }

        $metrics = Cache::get('ai_model_performance_metrics', []);
        
        if (!isset($metrics[$model->id])) {
            $metrics[$model->id] = [
                'success_count' => 0,
                'total_count' => 0,
                'total_response_time' => 0,
                'success_rate' => 1.0,
                'avg_response_time' => 5.0
            ];
        }
        
        $metrics[$model->id]['total_count']++;
        $metrics[$model->id]['total_response_time'] += $responseTime;
        
        if ($success) {
            $metrics[$model->id]['success_count']++;
        }
        
        // Calculate averages
        $metrics[$model->id]['success_rate'] = $metrics[$model->id]['success_count'] / $metrics[$model->id]['total_count'];
        $metrics[$model->id]['avg_response_time'] = $metrics[$model->id]['total_response_time'] / $metrics[$model->id]['total_count'];
        
        Cache::put('ai_model_performance_metrics', $metrics, now()->addDays(7));
        
        Log::info('Updated model performance metrics', [
            'model' => $modelName,
            'success_rate' => $metrics[$model->id]['success_rate'],
            'avg_response_time' => $metrics[$model->id]['avg_response_time']
        ]);
    }

    /**
     * Get distribution statistics
     */
    public function getDistributionStats(?string $sessionId = null): array
    {
        $sessionUsage = Cache::get("ai_model_usage_{$sessionId}", []);
        $models = AiModel::enabled()->get()->keyBy('id');
        
        $stats = [];
        foreach ($sessionUsage as $modelId => $count) {
            $model = $models[$modelId] ?? null;
            if ($model) {
                $stats[] = [
                    'model' => $model->name,
                    'display_name' => $model->display_name,
                    'count' => $count,
                    'percentage' => array_sum($sessionUsage) > 0 
                        ? round(($count / array_sum($sessionUsage)) * 100, 2) 
                        : 0
                ];
            }
        }
        
        return $stats;
    }
}
