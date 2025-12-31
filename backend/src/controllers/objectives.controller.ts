import { Request, Response } from 'express';
import * as db from '../db';

export const getObjectivesByNode = async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    try {
        // Fetch objectives with their key results nested
        const query = `
            SELECT o.*, 
            COALESCE(
                (SELECT json_agg(kr.* ORDER BY kr.created_at ASC) 
                 FROM key_results kr 
                 WHERE kr.objective_id = o.id), 
                '[]'
            ) as key_results
            FROM objectives o
            WHERE o.node_id = $1
            ORDER BY o.type DESC, o.quarter ASC NULLS FIRST
        `;
        const result = await db.query(query, [nodeId]);

        let objectives = result.rows;

        // Ensure mandatory slots exist if not present (Self-healing/Lazy initialization)
        const currentYear = new Date().getFullYear();
        const hasAnnual = objectives.some(o => o.type === 'annual');
        const quarterlyFound = objectives.filter(o => o.type === 'quarterly').map(o => o.quarter);

        let modified = false;
        if (!hasAnnual) {
            const annual = await db.query(
                'INSERT INTO objectives (node_id, description, type, year) VALUES ($1, $2, $3, $4) RETURNING *',
                [nodeId, `Objetivo Anual ${currentYear}`, 'annual', currentYear]
            );
            objectives.push({ ...annual.rows[0], key_results: [] });
            modified = true;
        }

        for (let q = 1; q <= 4; q++) {
            const qStr = `Q${q}`;
            if (!quarterlyFound.includes(qStr)) {
                const quarterly = await db.query(
                    'INSERT INTO objectives (node_id, description, type, quarter, year) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [nodeId, `Objetivo ${qStr} ${currentYear}`, 'quarterly', qStr, currentYear]
                );
                objectives.push({ ...quarterly.rows[0], key_results: [] });
                modified = true;
            }
        }

        if (modified) {
            // Re-sort if we added new ones
            objectives.sort((a, b) => {
                if (a.type === b.type) {
                    if (a.quarter && b.quarter) return a.quarter.localeCompare(b.quarter);
                    return 0;
                }
                return a.type === 'annual' ? -1 : 1;
            });
        }

        res.json(objectives);
    } catch (error) {
        console.error('Error fetching objectives:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createObjective = async (req: Request, res: Response) => {
    const { node_id, description, type, quarter, year } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO objectives (node_id, description, type, quarter, year) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [node_id, description, type || 'quarterly', quarter, year]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating objective:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateObjective = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description, quarter, year } = req.body;
    try {
        const result = await db.query(
            'UPDATE objectives SET description = $1, quarter = $2, year = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [description, quarter, year, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Objective not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating objective:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteObjective = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM objectives WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Objective not found' });
        }
        res.json({ message: 'Objective deleted successfully' });
    } catch (error) {
        console.error('Error deleting objective:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
