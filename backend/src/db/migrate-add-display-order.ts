import { query } from './index';

async function addDisplayOrder() {
    console.log('Adding display_order columns to objectives and key_results tables...');

    try {
        // Add display_order column to objectives
        await query(`
            ALTER TABLE objectives ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
        `);
        console.log('✓ Added display_order column to objectives table');

        // Add display_order column to key_results
        await query(`
            ALTER TABLE key_results ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
        `);
        console.log('✓ Added display_order column to key_results table');

        // Set initial order for objectives based on creation time
        await query(`
            UPDATE objectives SET display_order = subquery.row_num - 1
            FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at, id) as row_num
                FROM objectives
            ) AS subquery
            WHERE objectives.id = subquery.id;
        `);
        console.log('✓ Populated display_order for existing objectives');

        // Set initial order for key_results based on creation time
        await query(`
            UPDATE key_results SET display_order = subquery.row_num - 1
            FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY objective_id ORDER BY created_at, id) as row_num
                FROM key_results
            ) AS subquery
            WHERE key_results.id = subquery.id;
        `);
        console.log('✓ Populated display_order for existing key_results');

        console.log('✓ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error running migration:', err);
        process.exit(1);
    }
}

addDisplayOrder();
