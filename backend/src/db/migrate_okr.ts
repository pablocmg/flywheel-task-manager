import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding type column to objectives...');
        await client.query('ALTER TABLE objectives ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT \'quarterly\'');

        console.log('Creating key_results table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS key_results (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                target_value NUMERIC DEFAULT 100,
                current_value NUMERIC DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if target_value still exists in objectives to migrate data
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'objectives' AND column_name = 'target_value'");

        if (res.rows.length > 0) {
            console.log('Migrating existing objective values to key_results...');
            // Create a default KR for each existing objective that has values
            await client.query(`
                INSERT INTO key_results (objective_id, description, target_value, current_value)
                SELECT id, 'Resultado Clave Principal', target_value, current_value 
                FROM objectives
            `);

            console.log('Removing old columns from objectives...');
            await client.query('ALTER TABLE objectives DROP COLUMN target_value');
            await client.query('ALTER TABLE objectives DROP COLUMN current_value');
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
