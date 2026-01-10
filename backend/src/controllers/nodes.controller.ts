import { Request, Response } from 'express';
import * as db from '../db';

export const getAllNodes = async (req: Request, res: Response) => {
    try {
        console.log('[getAllNodes] Starting query...');
        console.log('[getAllNodes] DATABASE_URL exists:', !!process.env.DATABASE_URL);
        const result = await db.query('SELECT * FROM nodes ORDER BY created_at ASC');
        console.log('[getAllNodes] Query successful, rows:', result.rows.length);
        res.json(result.rows);
    } catch (error) {
        console.error('[getAllNodes] Error fetching nodes:', error);
        console.error('[getAllNodes] Error details:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' });
    }
};

export const createNode = async (req: Request, res: Response) => {
    const { name, description, color, owner_id, is_central, is_active, generates_revenue } = req.body;
    try {
        await db.query('BEGIN');

        if (is_central) {
            await db.query('UPDATE nodes SET is_central = false');
        }
        const result = await db.query(
            'INSERT INTO nodes (name, description, color, owner_id, is_central, is_active, generates_revenue) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, description, color, owner_id, is_central || false, is_active !== undefined ? is_active : true, generates_revenue || false]
        );
        const node = result.rows[0];

        // Auto-create objectives hierarchy slots
        const currentYear = new Date().getFullYear();

        // 1. Annual Objective
        await db.query(
            'INSERT INTO objectives (node_id, description, type, year) VALUES ($1, $2, $3, $4)',
            [node.id, `Objetivo Anual ${currentYear}`, 'annual', currentYear]
        );

        // 2. Quarterly Objectives
        for (let q = 1; q <= 4; q++) {
            const qStr = `Q${q}`;
            await db.query(
                'INSERT INTO objectives (node_id, description, type, quarter, year) VALUES ($1, $2, $3, $4, $5)',
                [node.id, `Objetivo ${qStr} ${currentYear}`, 'quarterly', qStr, currentYear]
            );
        }

        await db.query('COMMIT');
        res.status(201).json(node);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating node:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getNodeById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM nodes WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Node not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching node:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateNode = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, color, owner_id, is_central, is_active, generates_revenue } = req.body;
    console.log(`[UPDATE NODE] ID: ${id}, Body:`, req.body);
    try {
        if (is_central) {
            await db.query('UPDATE nodes SET is_central = false WHERE id != $1', [id]);
        }

        const result = await db.query(
            'UPDATE nodes SET name = $1, description = $2, color = $3, owner_id = $4, is_central = $5, is_active = $6, generates_revenue = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8 RETURNING *',
            [name, description, color, owner_id, is_central || false, is_active !== undefined ? is_active : true, generates_revenue || false, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Node not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating node:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteNode = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM nodes WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Node not found' });
        }
        res.json({ message: 'Node deleted successfully' });
    } catch (error) {
        console.error('Error deleting node:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
