<?php

namespace App\Jobs;

use App\Models\AiModel;
use App\Models\Brand;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FetchCompetitors implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $brand;

    /**
     * Create a new job instance.
     */
    public function __construct(Brand $brand)
    {
        $this->brand = $brand;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Log::info("FetchCompetitors job started for brand ID: {$this->brand->id}");

        $aiModel = AiModel::where('provider_name', 'openai')->where('is_enabled', true)->first();

        if (! $aiModel || empty($aiModel->api_config['api_key'])) {
            Log::error('No enabled OpenAI model with API key found for fetching competitors.');

            return;
        }

        $prompt = $this->getPrompt();

        try {
            $response = Http::withToken($aiModel->api_config['api_key'])
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $aiModel->name,
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'max_tokens' => 4000,
                    'response_format' => ['type' => 'json_object'],
                ]);

            if ($response->failed()) {
                Log::error('OpenAI API call failed for competitor analysis', [
                    'brand_id' => $this->brand->id,
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return;
            }

            $data = $response->json();
            $content = $data['choices'][0]['message']['content'] ?? null;

            if (! $content) {
                Log::error('No content in OpenAI response for competitor analysis', ['brand_id' => $this->brand->id]);

                return;
            }

            $competitorsData = json_decode($content, true);

            // The prompt asks for a specific structure, but let's handle if it's nested under a key
            if (isset($competitorsData['competitors']) && is_array($competitorsData['competitors'])) {
                $competitors = $competitorsData['competitors'];
            } else {
                $competitors = $competitorsData;
            }

            if (json_last_error() !== JSON_ERROR_NONE || ! is_array($competitors)) {
                Log::error('Failed to decode JSON or invalid format from OpenAI response', [
                    'brand_id' => $this->brand->id,
                    'response' => $content,
                ]);

                return;
            }

            foreach ($competitors as $competitorData) {
                if (isset($competitorData['name']) && isset($competitorData['domain'])) {
                    $this->brand->competitors()->updateOrCreate(
                        ['domain' => $competitorData['domain']],
                        [
                            'name' => $competitorData['name'],
                            'mentions' => $competitorData['mentions'] ?? 10,
                            'status' => 'suggested',
                            'source' => 'ai',
                        ]
                    );
                }
            }

            Log::info("FetchCompetitors job completed for brand ID: {$this->brand->id}");

        } catch (\Exception $e) {
            Log::error('Error in FetchCompetitors job', [
                'brand_id' => $this->brand->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function getPrompt(): string
    {
        $brandUrl = $this->brand->website;

        return <<<PROMPT
You are an expert in brand and market competitor analysis. 
Given the following information about the brand at URL "{$brandUrl}"—including its products, values, and customer reviews—analyze deeply and strictly: 
Identify and list ONLY the brands that are direct competitors in the market (offering similar products,  similar customer segments). 
For each competitor, 
- include the brand name, 
- official website, 
- The total number of times that competitor is mentioned (as a brand or product) within the dataset, if mentioned at all (“Mentions”)
- If a brand is not mentioned directly, estimate mentions based on product similarity or omit/leave as “10”

The JSON response should be an array of objects, where each object has the following structure:
{
    "name": "{brand name}",
    "domain": "{brand website url}",
    "mentions": {total number of times competitor is mentioned}
}

Return only the JSON array.
PROMPT;
    }
}
