import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testQuery() {
    const client = await pool.connect();
    try {
        // Get a sample objective first
        const objResult = await client.query('SELECT id FROM objectives LIMIT 1');

        if (objResult.rows.length === 0) {
            console.log('No objectives found in database');
            return;
        }

        const objectiveId = objResult.rows[0].id;
        console.log(`Testing query for objective: ${objectiveId}\n`);

        // Test the exact query from the controller
        const query = `
            SELECT t.*, o.description as objective_title, p.name as project_name,
            (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count
            FROM tasks t  
            JOIN objectives o ON t.objective_id = o.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.objective_id = $1 
            ORDER BY t.created_at DESC
        `;

        console.log('Executing query...');
        const result = await client.query(query, [objectiveId]);

        console.log(`✅ Query successful!`);
        console.log(`Found ${result.rows.length} tasks`);
        console.log('Sample result:', result.rows[0] || 'No tasks found');

    } catch (error) {
        console.error('❌ Query failed with error:');
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

testQuery();
