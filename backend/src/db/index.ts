import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load dotenv only in local development (not on Vercel)
if (!process.env.VERCEL) {
    dotenv.config();
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = () => pool.connect();
