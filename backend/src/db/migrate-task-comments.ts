import { query } from './index';

async function runMigration() {
    console.log('Running migration: task_comments and final_deliverables...');

    try {
        // 1. Add final_deliverables JSONB column to tasks table
        console.log('Adding final_deliverables column...');
        await query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS final_deliverables JSONB DEFAULT '[]'
        `);

        // 2. Migrate existing evidence data to new format
        console.log('Migrating existing evidence data...');
        await query(`
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
            WHERE evidence_url IS NOT NULL AND evidence_url != ''
            AND (final_deliverables IS NULL OR final_deliverables = '[]'::jsonb)
        `);

        // 3. Create task_comments table
        console.log('Creating task_comments table...');
        await query(`
            CREATE TABLE IF NOT EXISTS task_comments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                user_id UUID,
                user_name VARCHAR(255),
                content TEXT,
                attachments JSONB DEFAULT '[]',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Create indexes
        console.log('Creating indexes...');
        await query(`CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC)`);

        console.log('Migration completed successfully!');

        // Verify the changes
        const verifyTasks = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'final_deliverables'
        `);
        console.log('tasks.final_deliverables column:', verifyTasks.rows);

        const verifyComments = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'task_comments'
        `);
        console.log('task_comments table exists:', verifyComments.rows.length > 0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

runMigration();
