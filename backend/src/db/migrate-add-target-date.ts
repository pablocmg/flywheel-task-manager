// Migration script to add target_date column to projects table
import { query } from './index';

async function migrate() {
    try {
        console.log('Adding target_date column to projects table...');

        await query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS target_date VARCHAR(50)
        `);

        console.log('✓ Migration completed successfully!');
        console.log('  - Added target_date column to projects table');
        console.log('  - Column supports both date strings (YYYY-MM-DD) and quarter identifiers (T1, T2, T3, T4)');

        process.exit(0);
    } catch (error) {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
