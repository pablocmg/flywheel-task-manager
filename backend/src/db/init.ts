import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const schemaPath = path.join(__dirname, 'schema.sql');

async function initDb() {
    try {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('Database schema applied successfully.');
    } catch (error) {
        console.error('Error applying schema:', error);
    } finally {
        await pool.end();
    }
}

initDb();
