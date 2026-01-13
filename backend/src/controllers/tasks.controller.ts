import { Request, Response } from 'express';
import * as db from '../db';

export const getAllTasks = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT t.*, o.description as objective_title, p.name as project_name,
                   n.name as node_name,
                   n.color as node_color,
                   a.name as assignee_name,
                   (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
                   (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes
            FROM tasks t
            JOIN objectives o ON t.objective_id = o.id
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN nodes n ON o.node_id = n.id
            LEFT JOIN assignees a ON t.assignee_id = a.id
            ORDER BY t.priority_score DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all tasks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTaskById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT t.*, 
                   o.description as objective_title,
                   p.name as project_name,
                   n.name as node_name,
                   n.color as node_color,
                   a.name as assignee_name,
                   (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
                   (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes
            FROM tasks t
            JOIN objectives o ON t.objective_id = o.id
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN nodes n ON o.node_id = n.id
            LEFT JOIN assignees a ON t.assignee_id = a.id
            WHERE t.id = $1
        `;
        const result = await db.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTasksByObjective = async (req: Request, res: Response) => {
    const { objectiveId } = req.params;
    try {
        const query = `
            SELECT t.*, 
                   o.description as objective_title,
                   p.name as project_name,
                   a.name as assignee_name,
                   (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
                   (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes
            FROM tasks t
            JOIN objectives o ON t.objective_id = o.id
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN assignees a ON t.assignee_id = a.id
            WHERE t.objective_id = $1
            ORDER BY t.priority_score DESC
        `;
        const result = await db.query(query, [objectiveId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks by objective:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTasksByProject = async (req: Request, res: Response) => {
    const { projectId } = req.params;
    try {
        const query = `
            SELECT t.*, 
                   o.description as objective_title,
                   p.name as project_name,
                   n.name as node_name,
                   n.color as node_color,
                   a.name as assignee_name,
                   (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
                   (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes
            FROM tasks t
            JOIN objectives o ON t.objective_id = o.id
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN nodes n ON o.node_id = n.id
            LEFT JOIN assignees a ON t.assignee_id = a.id
            WHERE t.project_id = $1
            ORDER BY t.priority_score DESC
        `;
        const result = await db.query(query, [projectId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching tasks by project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getTasksByWeek = async (req: Request, res: Response) => {
    const { weekNumber } = req.params;
    try {
        const query = `
            SELECT t.*, 
                   o.description as objective_title,
                   p.name as project_name,
                   n.name as node_name,
                   n.color as node_color,
                   a.name as assignee_name,
                   (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
                   (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes
            FROM tasks t
            JOIN objectives o ON t.objective_id = o.id
            LEFT JOIN projects p ON t.project_id = p.id
            LEFT JOIN nodes n ON o.node_id = n.id
            LEFT JOIN assignees a ON t.assignee_id = a.id
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
    const { title, description, objective_id, status, weight, priority_score, evidence_url, target_date, project_id, assignee_id, complexity } = req.body;
    try {
        const query = `
            INSERT INTO tasks (title, description, objective_id, status, weight, priority_score, evidence_url, target_date, project_id, assignee_id, complexity)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const values = [title, description, objective_id, status || 'Backlog', weight || 1, priority_score || 0, evidence_url, target_date, project_id, assignee_id || null, complexity || null];
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, status, priority_score, objective_id, target_date, evidence_url, assignee_id, complexity } = req.body;
    try {
        const query = `
            UPDATE tasks
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                status = COALESCE($3, status),
                priority_score = COALESCE($4, priority_score),
                objective_id = COALESCE($5, objective_id),
                target_date = COALESCE($6, target_date),
                evidence_url = COALESCE($7, evidence_url),
                assignee_id = $8,
                complexity = $9
            WHERE id = $10
            RETURNING *
        `;
        const values = [
            title,
            description,
            status,
            priority_score,
            objective_id || null, // Convert empty string to null for UUID
            target_date || null,  // Convert empty string to null for DATE
            evidence_url,
            assignee_id !== undefined ? (assignee_id || null) : undefined,
            complexity !== undefined ? (complexity || null) : undefined,
            id
        ];
        const result = await db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const query = 'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *';
        const result = await db.query(query, [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateTaskPriority = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority_score, reason } = req.body;

    if (priority_score === undefined || priority_score === null) {
        return res.status(400).json({ error: 'priority_score is required' });
    }

    try {
        // Update the task's priority score
        const updateQuery = 'UPDATE tasks SET priority_score = $1 WHERE id = $2 RETURNING *';
        const updateResult = await db.query(updateQuery, [priority_score, id]);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Log the priority change (optional, for audit trail)
        const logQuery = `
            INSERT INTO priority_change_log (task_id, new_score, reason, changed_at)
            VALUES ($1, $2, $3, NOW())
        `;
        const logReason = reason || 'Automatic reprioritization via drag-and-drop';

        try {
            await db.query(logQuery, [id, priority_score, logReason]);
        } catch (logError) {
            // If logging fails, it's not critical - continue
            console.warn('Failed to log priority change:', logError);
        }

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Error updating task priority:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get task dependencies
export const getTaskDependencies = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                td.dependency_type,
                td.target_task_id,
                t.title as target_task_title,
                t.status as target_task_status
            FROM task_dependencies td
            JOIN tasks t ON td.target_task_id = t.id
            WHERE td.source_task_id = $1
            ORDER BY td.dependency_type, t.title
        `;
        const result = await db.query(query, [id]);

        // Group by dependency type
        const dependencies = {
            depends_on: result.rows.filter(r => r.dependency_type === 'depends_on').map(r => ({
                id: r.target_task_id,
                title: r.target_task_title,
                status: r.target_task_status
            })),
            enables: result.rows.filter(r => r.dependency_type === 'enables').map(r => ({
                id: r.target_task_id,
                title: r.target_task_title,
                status: r.target_task_status
            }))
        };

        res.json(dependencies);
    } catch (error) {
        console.error('Error fetching task dependencies:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update task dependencies
export const updateTaskDependencies = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { depends_on, enables } = req.body;

    try {
        // Start transaction
        await db.query('BEGIN');

        // Delete existing dependencies for this task
        await db.query('DELETE FROM task_dependencies WHERE source_task_id = $1', [id]);

        // Insert new depends_on dependencies
        if (depends_on && Array.isArray(depends_on) && depends_on.length > 0) {
            console.log(`Processing depends_on for task ${id}:`, depends_on);
            const uniqueDependsOn = [...new Set(depends_on)].filter((targetId: string) => targetId !== id && targetId);

            if (uniqueDependsOn.length > 0) {
                const dependsOnValues = uniqueDependsOn.map((targetId: string) =>
                    `('${id}', '${targetId}', 'depends_on')`
                ).join(',');

                await db.query(`
                    INSERT INTO task_dependencies (source_task_id, target_task_id, dependency_type)
                    VALUES ${dependsOnValues}
                `);
            }
        }

        // Insert new enables dependencies
        if (enables && Array.isArray(enables) && enables.length > 0) {
            console.log(`Processing enables for task ${id}:`, enables);
            const uniqueEnables = [...new Set(enables)].filter((targetId: string) => targetId !== id && targetId);

            if (uniqueEnables.length > 0) {
                const enablesValues = uniqueEnables.map((targetId: string) =>
                    `('${id}', '${targetId}', 'enables')`
                ).join(',');

                await db.query(`
                    INSERT INTO task_dependencies (source_task_id, target_task_id, dependency_type)
                    VALUES ${enablesValues}
                `);
            }
        }

        // Commit transaction
        await db.query('COMMIT');

        res.json({ message: 'Dependencies updated successfully' });
    } catch (error) {
        // Rollback on error
        await db.query('ROLLBACK');
        console.error('Error updating task dependencies:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
