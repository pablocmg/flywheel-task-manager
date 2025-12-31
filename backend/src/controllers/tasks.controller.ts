
import { Request, Response } from 'express';
import * as db from '../db';

export const getTasksByObjective = async (req: Request, res: Response) => {
    const { objectiveId } = req.params;
    try {
        const query = `
            SELECT t.*, o.description as objective_title, p.name as project_name,
            (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count
            FROM tasks t
            JOIN objectives o ON t.objective_id = o.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.objective_id = $1 
            ORDER BY t.created_at DESC
        `;
        const result = await db.query(query, [objectiveId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTasksByWeek = async (req: Request, res: Response) => {
    const { weekNumber } = req.params;
    try {
        const query = `
            SELECT t.*, o.description as objective_title, p.name as project_name,
            (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
            (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes
            FROM tasks t
            JOIN objectives o ON t.objective_id = o.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.week_number = $1 
            ORDER BY t.priority_score DESC
        `;
        const result = await db.query(query, [weekNumber]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks by week:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createTask = async (req: Request, res: Response) => {
    const { objective_id, project_id, title, description, assignee_id, week_number, weight, due_date, impacted_node_ids } = req.body;

    // Calculate Priority Score
    // Algo: PriorityScore = RemainingDays * (ObjectiveWeight * TaskImportance) + (Count(NodesImpacted) * 2)
    // Simplified for now as we don't have ObjectiveWeight easily accessible without a join, assume 1 for obj weight.
    // Remaining days = due_date - now (in days). If no due_date, assume 7 days.

    let remainingDays = 7;
    if (due_date) {
        const diffTime = new Date(due_date).getTime() - new Date().getTime();
        remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (remainingDays < 0) remainingDays = 0; // Overdue tasks still have priority, but let's clamp positive for multiplier logic or handle differently.
    }

    const taskWeight = weight || 3;
    const impactBonus = (impacted_node_ids && Array.isArray(impacted_node_ids)) ? impacted_node_ids.length * 2 : 0;

    // Logic: Higher weight and closer due date (less remaining days) should increase score? 
    // Usually Priority = Urgency * Importance. 
    // Let's use: (TaskWeight * 10) + ImpactBonus - RemainingDays (closer is higher score, ensure min score)
    // Or User's formula: RemainingDays * ... wait, if remaining days is large, priority is high? Maybe "1/RemainingDays".
    // Let's invert RemainingDays effect: (30 - RemainingDays)

    const timeFactor = Math.max(0, 30 - remainingDays); // Cap at 30 days window
    const priority_score = (timeFactor * taskWeight) + impactBonus;

    try {
        // Start transaction
        await db.query('BEGIN');

        const result = await db.query(
            'INSERT INTO tasks (objective_id, project_id, title, description, assignee_id, week_number, weight, due_date, priority_score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [objective_id, project_id || null, title, description, assignee_id, week_number, taskWeight, due_date, priority_score]
        );
        const task = result.rows[0];

        // Handle Cross Node Impacts
        if (impacted_node_ids && Array.isArray(impacted_node_ids)) {
            for (const nodeId of impacted_node_ids) {
                await db.query(
                    'INSERT INTO cross_node_impacts (source_task_id, target_node_id) VALUES ($1, $2)',
                    [task.id, nodeId]
                );
            }
        }

        await db.query('COMMIT');
        res.status(201).json(task);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    // Check for file upload
    let evidence_url = req.body.evidence_url;
    if (req.file) {
        // Assuming the server serves 'uploads' statically or we construct a URL
        evidence_url = `/uploads/${req.file.filename}`;
    }

    // User Story 3.1: Block closure if no evidence
    if (status === 'Done' && !evidence_url) {
        return res.status(400).json({ error: 'Evidence (URL or File) is required to mark task as Done' });
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
};

export const updateTaskPriority = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { new_priority_score, reason } = req.body;

    if (!reason) {
        return res.status(400).json({ error: 'Reason for change is required for reprioritization.' });
    }

    try {
        await db.query('BEGIN');

        const result = await db.query(
            'UPDATE tasks SET priority_score = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [new_priority_score, id]
        );

        // Log to Audit Logs
        // Assuming we have a user_id from auth (placeholder for now)
        const user_id = null;
        await db.query(
            'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, reason_for_change) VALUES ($1, $2, $3, $4, $5)',
            [user_id, 'REPRIORITIZE', 'task', id, reason]
        );

        await db.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error reprioritizing task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
