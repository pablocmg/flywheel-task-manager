import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function ensureOKRHierarchy() {
    const client = await pool.connect();
    try {
        console.log('Ensuring all nodes have proper OKR hierarchy...\n');

        // Get all nodes
        const nodesResult = await client.query('SELECT id, name FROM nodes');
        const nodes = nodesResult.rows;

        console.log(`Found ${nodes.length} nodes\n`);

        for (const node of nodes) {
            console.log(`Checking node: ${node.name}`);

            // Get existing objectives
            const objsResult = await client.query(
                'SELECT * FROM objectives WHERE node_id = $1',
                [node.id]
            );
            const objectives = objsResult.rows;

            const currentYear = new Date().getFullYear();
            const hasAnnual = objectives.some((o: any) => o.type === 'annual');
            const quarterlyQuarters = objectives.filter((o: any) => o.type === 'quarterly').map((o: any) => o.quarter);

            let modified = false;

            // Create annual if missing
            if (!hasAnnual) {
                console.log(`  Creating Annual objective for ${currentYear}`);
                await client.query(
                    'INSERT INTO objectives (node_id, description, type, year) VALUES ($1, $2, $3, $4)',
                    [node.id, `Objetivo Anual ${currentYear}`, 'annual', currentYear]
                );
                modified = true;
            }

            // Create quarterly objectives if missing
            for (let q = 1; q <= 4; q++) {
                const qStr = `Q${q}`;
                if (!quarterlyQuarters.includes(qStr)) {
                    console.log(`  Creating ${qStr} objective`);
                    await client.query(
                        'INSERT INTO objectives (node_id, description, type, quarter, year) VALUES ($1, $2, $3, $4, $5)',
                        [node.id, `Objetivo ${qStr} ${currentYear}`, 'quarterly', qStr, currentYear]
                    );
                    modified = true;
                }
            }

            if (!modified) {
                console.log(`  ✓ Already has complete hierarchy`);
            }
        }

        console.log('\n✅ All nodes now have complete OKR hierarchy');

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

ensureOKRHierarchy();
