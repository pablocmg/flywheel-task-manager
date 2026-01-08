-- Migration: Add task dependencies table
-- This table stores relationships between tasks (depends_on and enables)

CREATE TYPE dependency_type AS ENUM ('depends_on', 'enables');

CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type dependency_type NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure no duplicate dependencies
    UNIQUE(source_task_id, target_task_id, dependency_type),
    
    -- Prevent self-referencing dependencies
    CHECK (source_task_id != target_task_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_task_dependencies_source ON task_dependencies(source_task_id);
CREATE INDEX idx_task_dependencies_target ON task_dependencies(target_task_id);
CREATE INDEX idx_task_dependencies_type ON task_dependencies(dependency_type);
