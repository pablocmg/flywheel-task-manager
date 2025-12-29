import { Request, Response } from 'express';
import * as db from '../db';

export const getTasksByObjective = async (req: Request, res: Response) => {
    const { objectiveId } = req.params;
    try {
        const result = await db.query('SELECT * FROM tasks WHERE objective_id = $1 ORDER BY created_at DESC', [objectiveId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTasksByWeek = async (req: Request, res: Response) => {
    const { weekNumber } = req.params;
    try {
        const result = await db.query('SELECT * FROM tasks WHERE week_number = $1 ORDER BY priority_score DESC', [weekNumber]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks by week:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createTask = async (req: Request, res: Response) => {
    const { objective_id, title, description, assignee_id, week_number, weight, due_date } = req.body;

    // Placeholder for Priority Score Calculation Logic
    // For now, default to 0 or simple heuristic
    const priority_score = 0;

    try {
        const result = await db.query(
            'INSERT INTO tasks (objective_id, title, description, assignee_id, week_number, weight, due_date, priority_score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [objective_id, title, description, assignee_id, week_number, weight, due_date, priority_score]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, evidence_url } = req.body;

    // User Story 3.1: Block closure if no evidence
    if (status === 'Done' && !evidence_url) {
        return res.status(400).json({ error: 'Evidence URL is required to mark task as Done' });
    }

    try {
        const result = await db.query(
            'UPDATE tasks SET status = $1, evidence_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [status, evidence_url, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
