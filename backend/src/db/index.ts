import { Pool } from 'pg';

// Don't use dotenv.config() in serverless - env vars are injected by platform
// For local dev, use .env files normally

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = () => pool.connect();
