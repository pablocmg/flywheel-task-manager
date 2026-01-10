-- Create assignees table
CREATE TABLE IF NOT EXISTS assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint to existing assignee_id in tasks table
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS fk_tasks_assignee;

ALTER TABLE tasks
ADD CONSTRAINT fk_tasks_assignee
FOREIGN KEY (assignee_id) REFERENCES assignees(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assignees_name ON assignees(name);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
