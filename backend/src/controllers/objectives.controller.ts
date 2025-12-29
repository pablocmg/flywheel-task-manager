import { Request, Response } from 'express';
import * as db from '../db';

export const getObjectivesByNode = async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    try {
        const result = await db.query('SELECT * FROM objectives WHERE node_id = $1 ORDER BY created_at DESC', [nodeId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching objectives:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createObjective = async (req: Request, res: Response) => {
    const { node_id, description, target_value, current_value, quarter, year } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO objectives (node_id, description, target_value, current_value, quarter, year) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [node_id, description, target_value, current_value, quarter, year]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating objective:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateObjective = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description, target_value, current_value, quarter, year } = req.body;
    try {
        const result = await db.query(
            'UPDATE objectives SET description = $1, target_value = $2, current_value = $3, quarter = $4, year = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [description, target_value, current_value, quarter, year, id]
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
