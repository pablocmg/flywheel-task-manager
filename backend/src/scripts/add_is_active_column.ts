import { query } from '../db';

async function migrate() {
    console.log('Starting migration: Adding is_active column to nodes table...');
    try {
        await query(`
            ALTER TABLE nodes 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        `);
        console.log('Migration successful: is_active column added.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
