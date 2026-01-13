-- Migration: Add complexity field to tasks
-- Valid values: NULL (blank), 'S', 'M', 'L', 'XL', 'XXL'

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS complexity VARCHAR(10) DEFAULT NULL;

-- Optional: Add check constraint for valid values
-- ALTER TABLE tasks ADD CONSTRAINT valid_complexity CHECK (complexity IS NULL OR complexity IN ('S', 'M', 'L', 'XL', 'XXL'));
