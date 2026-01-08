-- Add target_date column to projects table
-- This allows projects to have either a specific date or a quarter (T1, T2, T3, T4) as target

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS target_date VARCHAR(50);

-- Add comment to explain the column usage
COMMENT ON COLUMN projects.target_date IS 'Can store either a date (YYYY-MM-DD) or a quarter identifier (T1, T2, T3, T4)';
