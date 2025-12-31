import { query } from '../db';

async function migrate() {
    console.log('Starting migration: Adding is_central column to nodes table...');
    try {
        await query(`
            ALTER TABLE nodes 
            ADD COLUMN IF NOT EXISTS is_central BOOLEAN DEFAULT FALSE;
        `);
        console.log('Migration successful: is_central column added.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
}

migrate();
