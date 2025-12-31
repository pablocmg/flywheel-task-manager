import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkTables() {
    const client = await pool.connect();
    try {
        const tables = ['nodes', 'objectives', 'tasks', 'projects', 'key_results', 'cross_node_impacts'];

        for (const table of tables) {
            console.log(`\n=== ${table.toUpperCase()} ===`);
            const result = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);

            result.rows.forEach(row => {
                console.log(`  ${row.column_name}: ${row.data_type}`);
            });
        }

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTables();
