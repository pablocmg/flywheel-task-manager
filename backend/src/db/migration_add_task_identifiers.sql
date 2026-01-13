-- Migration: Add Task Identifiers System
-- This migration adds a project_settings table and task_number column to support
-- dynamic task identifiers (prefix + number)

-- Step 1: Create project_settings table
CREATE TABLE IF NOT EXISTS project_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_prefix VARCHAR(3) NOT NULL CHECK (project_prefix ~ '^[A-Z]{3}$'),
    next_task_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Add task_number column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_number INTEGER;

-- Step 3: Insert initial project settings with "SDL" prefix
INSERT INTO project_settings (project_prefix, next_task_number)
VALUES ('SDL', 1)
ON CONFLICT DO NOTHING;

-- Step 4: Assign sequential task numbers to existing tasks based on creation order
WITH numbered_tasks AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at ASC) as task_num
    FROM tasks
    WHERE task_number IS NULL
)
UPDATE tasks
SET task_number = numbered_tasks.task_num
FROM numbered_tasks
WHERE tasks.id = numbered_tasks.id;

-- Step 5: Update next_task_number to be one more than the highest task number
UPDATE project_settings
SET next_task_number = (
    SELECT COALESCE(MAX(task_number), 0) + 1
    FROM tasks
);

-- Step 6: Make task_number NOT NULL now that all tasks have values
ALTER TABLE tasks ALTER COLUMN task_number SET NOT NULL;

-- Step 7: Add unique constraint on task_number
ALTER TABLE tasks ADD CONSTRAINT tasks_task_number_unique UNIQUE (task_number);

-- Verification query (uncomment to test):
-- SELECT 
--     (SELECT project_prefix FROM project_settings LIMIT 1) || '-' || task_number as task_identifier,
--     title,
--     created_at
-- FROM tasks
-- ORDER BY task_number;
