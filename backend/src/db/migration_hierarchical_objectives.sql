-- Migration: Hierarchical Objective Structure
-- This creates objective_groups table and migrates existing objectives

BEGIN;

-- 1. Create objective_groups table
CREATE TABLE IF NOT EXISTS objective_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    alias VARCHAR(255) NOT NULL,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add group_id column to objectives table
ALTER TABLE objectives ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES objective_groups(id) ON DELETE CASCADE;

-- 3. Migrate existing data - create default groups for existing objectives
INSERT INTO objective_groups (node_id, alias, target_date)
SELECT DISTINCT 
    o.node_id,
    CASE 
        WHEN o.type = 'annual' THEN 'Objetivo Anual ' || o.year
        ELSE o.quarter || ' ' || o.year
    END as alias,
    CAST(NULL AS DATE) as target_date
FROM objectives o
WHERE NOT EXISTS (
    SELECT 1 FROM objective_groups og 
    WHERE og.node_id = o.node_id 
    AND og.alias = CASE 
        WHEN o.type = 'annual' THEN 'Objetivo Anual ' || o.year
        ELSE o.quarter || ' ' || o.year
    END
);

-- 4. Link existing objectives to their groups
UPDATE objectives o
SET group_id = (
    SELECT og.id 
    FROM objective_groups og 
    WHERE og.node_id = o.node_id 
    AND og.alias = CASE 
        WHEN o.type = 'annual' THEN 'Objetivo Anual ' || o.year
        ELSE o.quarter || ' ' || o.year
    END
    LIMIT 1
)
WHERE group_id IS NULL;

COMMIT;
