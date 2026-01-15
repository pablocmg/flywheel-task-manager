-- Migration: Add final_deliverables and task_comments
-- Date: 2026-01-15

-- 1. Add final_deliverables JSONB column to tasks table
-- This replaces the simple evidence_url and evidence_description fields
-- Structure: [{ type, url, thumbnail, title, added_by, promoted_from_comment_id }]
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS final_deliverables JSONB DEFAULT '[]';

-- Migrate existing evidence data to new format (if any exists)
UPDATE tasks 
SET final_deliverables = jsonb_build_array(
    jsonb_build_object(
        'type', 'link',
        'url', evidence_url,
        'title', COALESCE(evidence_description, 'Legacy Evidence'),
        'added_by', null,
        'promoted_from_comment_id', null
    )
)
WHERE evidence_url IS NOT NULL AND evidence_url != '';

-- 2. Create task_comments table for activity log
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID,  -- Can be null for system comments
    user_name VARCHAR(255),  -- Display name for the commenter
    content TEXT,
    attachments JSONB DEFAULT '[]',  -- [{ url, type, name, size }]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by task
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);
