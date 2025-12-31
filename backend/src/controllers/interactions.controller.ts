import { Request, Response } from 'express';
import * as db from '../db';

export const getInteractions = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM node_interactions ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching interactions:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createInteraction = async (req: Request, res: Response) => {
    const { source_node_id, target_node_id, label, type } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO node_interactions (source_node_id, target_node_id, label, type) VALUES ($1, $2, $3, $4) RETURNING *',
            [source_node_id, target_node_id, label, type || 'one-way']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating interaction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteInteraction = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM node_interactions WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Interaction not found' });
        }
        res.json({ message: 'Interaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting interaction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
