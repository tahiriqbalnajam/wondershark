<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Split the OpenAI model config:
 *   - api_config.model        = gpt-4o   (general chat model used by the admin
 *                                        "test AI model" button and all other
 *                                        AI features — supports max_tokens /
 *                                        temperature via Chat Completions)
 *   - api_config.search_model = gpt-5.5  (dedicated web-search model used only
 *                                        by CitationCheckService via the
 *                                        Responses API + web_search tool)
 *
 * gpt-5.5 is a reasoning model and rejects max_tokens/temperature, so it must
 * NOT be the general `model`. JSON_SET preserves the existing api_key/endpoint.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('ai_models')
            ->where('name', 'openai')
            ->update([
                'api_config' => DB::raw(
                    "JSON_SET(api_config, '$.model', 'gpt-4o', '$.search_model', 'gpt-5.5')"
                ),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Restore the pre-migration state: general chat model + no search_model.
        DB::table('ai_models')
            ->where('name', 'openai')
            ->update([
                'api_config' => DB::raw(
                    "JSON_SET(JSON_REMOVE(api_config, '$.search_model'), '$.model', 'gpt-4o')"
                ),
                'updated_at' => now(),
            ]);
    }
};