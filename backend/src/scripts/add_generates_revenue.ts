import { query } from '../db';

const migrate = async () => {
    console.log('Starting migration: Adding generates_revenue column to nodes table...');
    try {
        await query(`
            ALTER TABLE nodes 
            ADD COLUMN IF NOT EXISTS generates_revenue BOOLEAN DEFAULT FALSE
        `);
        console.log('Migration successful: generates_revenue column added.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
    process.exit(0);
};

migrate();

