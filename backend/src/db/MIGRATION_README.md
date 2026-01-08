# Task Dependencies Migration

## Instructions

To enable task dependencies, you need to run the SQL migration script.

### Option 1: Using psql command line

```bash
psql -U postgres -d flywheel_db -f backend/src/db/migration_task_dependencies.sql
```

### Option 2: Using pgAdmin or any PostgreSQL client

1. Open your PostgreSQL client
2. Connect to the `flywheel_db` database
3. Open and execute the file: `backend/src/db/migration_task_dependencies.sql`

### Option 3: Copy and paste the SQL

Open `backend/src/db/migration_task_dependencies.sql` and copy-paste the SQL into your PostgreSQL query tool.

## What this migration does

- Creates a new ENUM type `dependency_type` with values: 'depends_on', 'enables'
- Creates a `task_dependencies` table to store relationships between tasks
- Adds indexes for better query performance
- Adds constraints to prevent duplicate dependencies and self-referencing

## After running the migration

Restart your backend server to ensure the new endpoints are loaded.
