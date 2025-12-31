
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function migrate() {
    try {
        await client.connect();

        // Add column if not exists
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nodes' AND column_name='is_central') THEN 
                    ALTER TABLE nodes ADD COLUMN is_central BOOLEAN DEFAULT FALSE; 
                END IF; 
            END 
            $$;
        `);

        console.log('Migration successful: Added is_central to nodes table.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
