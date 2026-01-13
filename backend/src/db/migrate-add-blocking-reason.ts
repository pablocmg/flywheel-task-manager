// Migration script to add blocking_reason column to tasks table
import { query } from './index';

async function migrate() {
    try {
        console.log('Adding blocking_reason column to tasks table...');

        await query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS blocking_reason TEXT
        `);

        console.log('✓ Migration completed successfully!');
        console.log('  - Added blocking_reason column to tasks table');

        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
