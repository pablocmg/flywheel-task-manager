-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Nodes Table (Strategic Level)
CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(50), -- Hex code or color name
    owner_id UUID, -- References an external auth user or internal user table
    health INTEGER DEFAULT 100 CHECK (health >= 0 AND health <= 100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Objectives / OKRs (Strategic Level)
-- "No se pueden crear tareas sin un objetivo padre"
CREATE TABLE IF NOT EXISTS objectives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    target_value NUMERIC DEFAULT 100,
    current_value NUMERIC DEFAULT 0,
    quarter VARCHAR(10), -- e.g., "Q1", "Q2"
    year INTEGER,        -- e.g., 2025
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tasks (Operational Level)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id UUID,
    week_number INTEGER, -- ISO week number
    weight INTEGER DEFAULT 3 CHECK (weight >= 1 AND weight <= 5),
    priority_score NUMERIC DEFAULT 0, -- Calculated: RemainingDays * (ObjWeight * TaskImp) + ...
    status VARCHAR(50) DEFAULT 'Todo', -- Todo, Doing, Waiting, Done
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Evidence for "Done" status
    evidence_url TEXT,
    evidence_description TEXT,

    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Cross-Node Impacts (Dependency Mapping)
-- "Marcarlas como Habilitadoras de otro Nodo"
CREATE TABLE IF NOT EXISTS cross_node_impacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    impact_weight INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_task_id, target_node_id)
);

-- 5. Audit Logs (Security & Reprioritization Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50), -- 'task', 'objective', 'node'
    entity_id UUID,
    reason_for_change TEXT, -- Mandatory for reprioritization
    details JSONB,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
