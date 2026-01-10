import { Request, Response } from 'express';
import * as db from '../db';

// Get all assignees
export const getAllAssignees = async (req: Request, res: Response) => {
    try {
        const query = 'SELECT * FROM assignees ORDER BY name ASC';
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching assignees:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get or create assignee by name
export const getOrCreateAssignee = async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Assignee name is required' });
    }

    try {
        // First, try to find existing assignee (case-insensitive)
        const findQuery = 'SELECT * FROM assignees WHERE LOWER(name) = LOWER($1)';
        const findResult = await db.query(findQuery, [name.trim()]);

        if (findResult.rows.length > 0) {
            return res.json(findResult.rows[0]);
        }

        // Create new assignee if not found
        const createQuery = 'INSERT INTO assignees (name) VALUES ($1) RETURNING *';
        const createResult = await db.query(createQuery, [name.trim()]);
        res.status(201).json(createResult.rows[0]);
    } catch (error) {
        console.error('Error getting/creating assignee:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
