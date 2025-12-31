import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixSchema() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Fixing schema issues...\n');

        // 1. Add project_id to tasks if missing
        console.log('1. Adding project_id column to tasks table...');
        await client.query(`
            ALTER TABLE tasks 
            ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL
        `);
        console.log('   ✓ Done');

        // 2. Remove node_id from projects if it exists
        console.log('2. Removing node_id column from projects table...');
        const checkNodeId = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'projects' AND column_name = 'node_id'
        `);

        if (checkNodeId.rows.length > 0) {
            await client.query('ALTER TABLE projects DROP COLUMN node_id');
            console.log('   ✓ Removed node_id from projects');
        } else {
            console.log('   ✓ node_id already removed');
        }

        await client.query('COMMIT');
        console.log('\n✅ Schema fixes applied successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing schema:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

fixSchema();
