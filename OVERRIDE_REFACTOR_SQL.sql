-- =====================================================================
-- VISIBILITY OVERRIDE REFACTOR - SQL COMMANDS TO RUN MANUALLY
-- =====================================================================
-- Run these commands in order to refactor the override system from
-- creating new rows to using a dedicated override column.
-- =====================================================================

-- Step 1: Add the new columns (override_reason and overridden_by already exist)
ALTER TABLE brand_competitive_stats 
ADD COLUMN visibility_override DECIMAL(5,2) NULL AFTER visibility,
ADD COLUMN overridden_at TIMESTAMP NULL AFTER overridden_by;

-- Step 2: Add foreign key for overridden_by (if it doesn't already exist)
-- Run this only if the foreign key doesn't exist yet
-- You can check with: SHOW CREATE TABLE brand_competitive_stats;
-- Uncomment if needed:
-- ALTER TABLE brand_competitive_stats 
-- ADD CONSTRAINT fk_brand_competitive_stats_overridden_by 
-- FOREIGN KEY (overridden_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: Migrate existing override data to the new column structure
-- This finds override rows and merges them back into the original AI rows
UPDATE brand_competitive_stats bcs_ai
INNER JOIN (
    SELECT 
        brand_id,
        entity_type,
        competitor_id,
        DATE(analyzed_at) as analysis_date,
        visibility as override_value,
        override_reason,
        overridden_by,
        analyzed_at as overridden_at
    FROM brand_competitive_stats
    WHERE is_manual_override = 1
) bcs_override 
ON bcs_ai.brand_id = bcs_override.brand_id
AND bcs_ai.entity_type = bcs_override.entity_type
AND COALESCE(bcs_ai.competitor_id, 0) = COALESCE(bcs_override.competitor_id, 0)
AND DATE(bcs_ai.analyzed_at) = bcs_override.analysis_date
AND bcs_ai.is_manual_override = 0
SET 
    bcs_ai.visibility_override = bcs_override.override_value,
    bcs_ai.override_reason = bcs_override.override_reason,
    bcs_ai.overridden_by = bcs_override.overridden_by,
    bcs_ai.overridden_at = bcs_override.overridden_at;

-- Step 4: Delete all override rows (they're now merged into the main rows)
DELETE FROM brand_competitive_stats WHERE is_manual_override = 1;

-- Step 5: (Optional) Remove the is_manual_override column since it's no longer needed
-- Uncomment the line below if you want to remove it completely
-- ALTER TABLE brand_competitive_stats DROP COLUMN is_manual_override;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Check how many rows have overrides
SELECT COUNT(*) as rows_with_overrides 
FROM brand_competitive_stats 
WHERE visibility_override IS NOT NULL;

-- View sample of overridden rows
SELECT 
    id,
    brand_id,
    entity_type,
    entity_name,
    visibility as ai_visibility,
    visibility_override,
    override_reason,
    DATE(analyzed_at) as date
FROM brand_competitive_stats 
WHERE visibility_override IS NOT NULL
LIMIT 20;

-- Check if any override rows remain (should be 0)
SELECT COUNT(*) as remaining_override_rows 
FROM brand_competitive_stats 
WHERE is_manual_override = 1;
