-- Add display_order columns to objectives and key_results tables
ALTER TABLE objectives ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE key_results ADD COLUMN display_order INTEGER DEFAULT 0;

-- Set initial order based on creation time (or ID if no created_at)
UPDATE objectives SET display_order = subquery.row_num - 1
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at, id) as row_num
    FROM objectives
) AS subquery
WHERE objectives.id = subquery.id;

UPDATE key_results SET display_order = subquery.row_num - 1
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY objective_id ORDER BY created_at, id) as row_num
    FROM key_results
) AS subquery
WHERE key_results.id = subquery.id;
