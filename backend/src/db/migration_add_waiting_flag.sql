-- Migration: Add is_waiting_third_party column to tasks table
-- This boolean flag indicates when a task is waiting for external input

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_waiting_third_party BOOLEAN DEFAULT FALSE;
