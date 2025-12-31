import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function diagnose() {
    const client = await pool.connect();
    try {
        console.log('=== DIAGNOSTIC REPORT ===\n');

        // Check objectives table structure
        console.log('1. Objectives table columns:');
        const columns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'objectives'
            ORDER BY ordinal_position
        `);
        console.log(columns.rows);

        // Check sample objectives
        console.log('\n2. Sample objectives:');
        const objs = await client.query('SELECT * FROM objectives LIMIT 5');
        console.log(objs.rows);

        // Check key results
        console.log('\n3. Sample key_results:');
        const krs = await client.query('SELECT * FROM key_results LIMIT 5');
        console.log(krs.rows);

        // Test the problematic query
        console.log('\n4. Testing tasks query:');
        if (objs.rows.length > 0) {
            const testQuery = `
                SELECT t.*, o.description as objective_title, p.name as project_name,
                (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count
                FROM tasks t
                JOIN objectives o ON t.objective_id = o.id
                LEFT JOIN projects p ON t.project_id = p.id
                WHERE t.objective_id = $1 
                ORDER BY t.created_at DESC
            `;
            const testResult = await client.query(testQuery, [objs.rows[0].id]);
            console.log('Query successful. Results:', testResult.rows.length);
            console.log(testResult.rows);
        }

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnose();
