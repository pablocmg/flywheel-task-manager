import { Request, Response } from 'express';
import * as db from '../db';

export const getAllNodes = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM nodes ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching nodes:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createNode = async (req: Request, res: Response) => {
    const { name, description, color, owner_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO nodes (name, description, color, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description, color, owner_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
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
    const { name, description, color, owner_id } = req.body;
    try {
        const result = await db.query(
            'UPDATE nodes SET name = $1, description = $2, color = $3, owner_id = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
            [name, description, color, owner_id, id]
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
