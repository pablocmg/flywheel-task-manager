import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        console.log('Clearing existing data...');
        await pool.query('DELETE FROM node_interactions');
        await pool.query('DELETE FROM nodes');

        console.log('Inserting Nodes...');

        // 1. Motor Central
        const motor = await pool.query(`
            INSERT INTO nodes (name, description, color, health) 
            VALUES ('Motor Central: Pool de Facilitadores', 'Teje la red de talento y propiedad intelectual. Talento Experto, Dinámicas Probadas, IP & Know-How.', '#1e293b', 100) 
            RETURNING id;
        `);
        const motorId = motor.rows[0].id;

        // 2. Eventos B2B
        const b2b = await pool.query(`
            INSERT INTO nodes (name, description, color, health) 
            VALUES ('1. Eventos Pagados B2B', 'Empresas. Tickets Altos. Output Financiero.', '#3b82f6', 100) 
            RETURNING id;
        `);
        const b2bId = b2b.rows[0].id;

        // 3. Advisor B2B
        const advisor = await pool.query(`
            INSERT INTO nodes (name, description, color, health) 
            VALUES ('2. Asesoría Growth Partner', 'Consultoría B2B. Retainer Recurrente. Implementación Profunda.', '#f59e0b', 100) 
            RETURNING id;
        `);
        const advisorId = advisor.rows[0].id;

        // 4. Eventos B2C
        const b2c = await pool.query(`
            INSERT INTO nodes (name, description, color, health) 
            VALUES ('3. Eventos Pagados B2C', 'Personas. Volumen de Ventas. Validación masiva.', '#10b981', 100) 
            RETURNING id;
        `);
        const b2cId = b2c.rows[0].id;

        // 5. Base Captación
        const base = await pool.query(`
            INSERT INTO nodes (name, description, color, health) 
            VALUES ('Base de Captación: Eventos Gratuitos', 'Semillero y Visibilidad. Reconocimiento y Leads.', '#64748b', 100) 
            RETURNING id;
        `);
        const baseId = base.rows[0].id;

        console.log('Inserting Interactions...');

        const interactions = [
            // Motor <-> B2B
            { s: motorId, t: b2bId, l: 'Input: Facilitadores Senior', type: 'one-way' },
            { s: b2bId, t: motorId, l: 'Output: Casos de Éxito', type: 'one-way' },

            // Motor <-> Advisor
            { s: motorId, t: advisorId, l: 'Input: Consultores Élite', type: 'one-way' },
            { s: advisorId, t: motorId, l: 'Output: Datos Industria', type: 'one-way' },

            // Motor <-> B2C
            { s: motorId, t: b2cId, l: 'Input: Dinámicas Empaquetadas', type: 'one-way' },
            { s: b2cId, t: motorId, l: 'Output: Nuevos Facilitadores', type: 'one-way' }, // Interpretation of flow back to motor

            // Base Flows
            { s: baseId, t: motorId, l: 'Validación de Talento', type: 'one-way' },
            { s: baseId, t: b2bId, l: 'Input: Leads B2B & Visibilidad', type: 'one-way' },

            // Cycle Flows
            // 3 -> 2 (B2C -> Advisor) "Autoridad de Marca para Venta Compleja"
            { s: b2cId, t: advisorId, l: 'Input: Autoridad de Marca', type: 'one-way' },

            // 3 -> Base ?? "Cantera de Talento"
            { s: b2cId, t: baseId, l: 'Cantera de Talento', type: 'one-way' },
        ];

        for (const i of interactions) {
            await pool.query(
                'INSERT INTO node_interactions (source_node_id, target_node_id, label, type) VALUES ($1, $2, $3, $4)',
                [i.s, i.t, i.l, i.type]
            );
        }

        console.log('Seeding completed successfully!');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await pool.end();
    }
}

seed();
