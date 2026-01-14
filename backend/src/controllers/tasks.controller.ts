import { Request, Response } from 'express';
import * as db from '../db';

export const getAllTasks = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT t.*, o.description as objective_title, p.name as project_name,
                   n.name as node_name,
                   n.color as node_color,
                   a.name as assignee_name,
                   (SELECT project_prefix FROM project_settings LIMIT 1) || '-' || t.task_number as task_identifier,
                   (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
                   (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes,
                   (SELECT EXISTS(
                       SELECT 1 FROM task_dependencies td
                       JOIN tasks dep_task ON td.target_task_id = dep_task.id
                       WHERE td.source_task_id = t.id 
                         AND td.dependency_type = 'depends_on'
                         AND dep_task.status != 'Done'
                   )) as has_incomplete_dependencies,
                   (SELECT COUNT(*) 
                    FROM task_dependencies td 
                    WHERE td.source_task_id = t.id 
                      AND td.dependency_type = 'depends_on') as blocked_by_count,
                   (SELECT COUNT(*) 
                    FROM task_dependencies td 
                    WHERE td.target_task_id = t.id 
                      AND td.dependency_type = 'depends_on') as blocking_count,
                   (SELECT json_agg(json_build_object('id', dep_task.id, 'title', dep_task.title))
                    FROM task_dependencies td
                    JOIN tasks dep_task ON td.target_task_id = dep_task.id
                    WHERE td.source_task_id = t.id 
                      AND td.dependency_type = 'depends_on') as blocked_by_tasks,
                   (SELECT json_agg(json_build_object('id', dep_task.id, 'title', dep_task.title))
                    FROM task_dependencies td
                    JOIN tasks dep_task ON td.source_task_id = dep_task.id
                    WHERE td.target_task_id = t.id 
                      AND td.dependency_type = 'depends_on') as blocking_tasks
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
                   (SELECT project_prefix FROM project_settings LIMIT 1) || '-' || t.task_number as task_identifier,
                   (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
                   (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes,
                   (SELECT COUNT(*) FROM task_dependencies td WHERE td.source_task_id = t.id AND td.dependency_type = 'depends_on') as blocked_by_count,
                   (SELECT COUNT(*) FROM task_dependencies td WHERE td.target_task_id = t.id AND td.dependency_type = 'depends_on') as blocking_count,
                   (SELECT json_agg(json_build_object('id', dep_task.id, 'title', dep_task.title)) FROM task_dependencies td JOIN tasks dep_task ON td.target_task_id = dep_task.id WHERE td.source_task_id = t.id AND td.dependency_type = 'depends_on') as blocked_by_tasks,
                   (SELECT json_agg(json_build_object('id', dep_task.id, 'title', dep_task.title)) FROM task_dependencies td JOIN tasks dep_task ON td.source_task_id = dep_task.id WHERE td.target_task_id = t.id AND td.dependency_type = 'depends_on') as blocking_tasks
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
                   (SELECT project_prefix FROM project_settings LIMIT 1) || '-' || t.task_number as task_identifier,
                   (SELECT COUNT(*) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_node_count,
                   (SELECT json_agg(target_node_id) FROM cross_node_impacts cni WHERE cni.source_task_id = t.id) as impacted_nodes,
                   (SELECT COUNT(*) FROM task_dependencies td WHERE td.source_task_id = t.id AND td.dependency_type = 'depends_on') as blocked_by_count,
                   (SELECT COUNT(*) FROM task_dependencies td WHERE td.target_task_id = t.id AND td.dependency_type = 'depends_on') as blocking_count,
                   (SELECT json_agg(json_build_object('id', dep_task.id, 'title', dep_task.title)) FROM task_dependencies td JOIN tasks dep_task ON td.target_task_id = dep_task.id WHERE td.source_task_id = t.id AND td.dependency_type = 'depends_on') as blocked_by_tasks,
                   (SELECT json_agg(json_build_object('id', dep_task.id, 'title', dep_task.title)) FROM task_dependencies td JOIN tasks dep_task ON td.source_task_id = dep_task.id WHERE td.target_task_id = t.id AND td.dependency_type = 'depends_on') as blocking_tasks
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
                   (SELECT project_prefix FROM project_settings LIMIT 1) || '-' || t.task_number as task_identifier,
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
                   (SELECT project_prefix FROM project_settings LIMIT 1) || '-' || t.task_number as task_identifier,
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
    const { title, description, objective_id, status, weight, priority_score, evidence_url, target_date, project_id, assignee_id, complexity, is_waiting_third_party } = req.body;
    try {
        // Use transaction to safely get and increment task number
        await db.query('BEGIN');

        // Get next task number and increment it atomically
        const settingsQuery = `
            UPDATE project_settings
            SET next_task_number = next_task_number + 1
            RETURNING next_task_number - 1 as task_number
        `;
        const settingsResult = await db.query(settingsQuery);
        const task_number = settingsResult.rows[0].task_number;

        // Insert task with the generated task_number
        const query = `
            INSERT INTO tasks (title, description, objective_id, status, weight, priority_score, evidence_url, target_date, project_id, assignee_id, complexity, is_waiting_third_party, task_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *,
                (SELECT project_prefix FROM project_settings LIMIT 1) || '-' || task_number as task_identifier
        `;
        const values = [title, description, objective_id, status || 'Backlog', weight || 1, priority_score || 0, evidence_url, target_date, project_id, assignee_id || null, complexity || null, is_waiting_third_party || false, task_number];
        const result = await db.query(query, values);

        await db.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, status, priority_score, objective_id, target_date, evidence_url, assignee_id, complexity, is_waiting_third_party, blocking_reason } = req.body;
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
                complexity = $9,
                is_waiting_third_party = COALESCE($10, is_waiting_third_party),
                blocking_reason = COALESCE($12, blocking_reason)
            WHERE id = $11
            RETURNING *
        `;
        const values = [
            title,
            description,
            status,
            priority_score,
            objective_id || null,
            target_date || null,
            evidence_url,
            assignee_id !== undefined ? (assignee_id || null) : undefined,
            complexity !== undefined ? (complexity || null) : undefined,
            is_waiting_third_party,
            id,
            blocking_reason
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
        // Query 1: Get tasks this task depends on (source_task = this, type = depends_on)
        const dependsOnQuery = `
            SELECT 
                td.target_task_id,
                t.title as target_task_title,
                t.status as target_task_status
            FROM task_dependencies td
            JOIN tasks t ON td.target_task_id = t.id
            WHERE td.source_task_id = $1 AND td.dependency_type = 'depends_on'
            ORDER BY t.title
        `;
        const dependsOnResult = await db.query(dependsOnQuery, [id]);

        // Query 2: Get tasks that this task enables (tasks that depend on this task)
        // This is the INVERSE of depends_on: where target_task = this, type = depends_on
        const enablesQuery = `
            SELECT 
                td.source_task_id as enabled_task_id,
                t.title as enabled_task_title,
                t.status as enabled_task_status
            FROM task_dependencies td
            JOIN tasks t ON td.source_task_id = t.id
            WHERE td.target_task_id = $1 AND td.dependency_type = 'depends_on'
            ORDER BY t.title
        `;
        const enablesResult = await db.query(enablesQuery, [id]);

        const dependencies = {
            depends_on: dependsOnResult.rows.map(r => ({
                id: r.target_task_id,
                title: r.target_task_title,
                status: r.target_task_status
            })),
            enables: enablesResult.rows.map(r => ({
                id: r.enabled_task_id,
                title: r.enabled_task_title,
                status: r.enabled_task_status
            }))
        };

        res.json(dependencies);
    } catch (error) {
        console.error('Error fetching task dependencies:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update task dependencies
// This ensures bidirectional consistency:
// - depends_on: stores (this_task, target_task, 'depends_on')
// - enables: stores (enabled_task, this_task, 'depends_on') - i.e., enabled_task depends_on this_task
export const updateTaskDependencies = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { depends_on, enables } = req.body;

    try {
        // Start transaction
        await db.query('BEGIN');

        // Step 1: Delete existing depends_on relationships where THIS task is the source
        await db.query(
            "DELETE FROM task_dependencies WHERE source_task_id = $1 AND dependency_type = 'depends_on'",
            [id]
        );

        // Step 2: Delete existing relationships where THIS task is the target (inverse enables)
        // This is safe because the UI sends the complete list of 'enables'
        await db.query(
            "DELETE FROM task_dependencies WHERE target_task_id = $1 AND dependency_type = 'depends_on'",
            [id]
        );

        // Step 3: Insert new depends_on dependencies (this task depends on target tasks)
        if (depends_on && Array.isArray(depends_on) && depends_on.length > 0) {
            const uniqueDependsOn = [...new Set(depends_on)].filter((targetId: string) => targetId !== id && targetId);

            if (uniqueDependsOn.length > 0) {
                const dependsOnValues = uniqueDependsOn.map((targetId: string) =>
                    `('${id}', '${targetId}', 'depends_on')`
                ).join(',');

                await db.query(`
                    INSERT INTO task_dependencies (source_task_id, target_task_id, dependency_type)
                    VALUES ${dependsOnValues}
                    ON CONFLICT (source_task_id, target_task_id, dependency_type) DO NOTHING
                `);
            }
        }

        // Step 4: Insert enables as inverse depends_on (enabled tasks depend on THIS task)
        if (enables && Array.isArray(enables) && enables.length > 0) {
            const uniqueEnables = [...new Set(enables)].filter((enabledId: string) => enabledId !== id && enabledId);

            if (uniqueEnables.length > 0) {
                // For each task this enables, create: (enabled_task depends_on this_task)
                const enablesValues = uniqueEnables.map((enabledId: string) =>
                    `('${enabledId}', '${id}', 'depends_on')`
                ).join(',');

                await db.query(`
                    INSERT INTO task_dependencies (source_task_id, target_task_id, dependency_type)
                    VALUES ${enablesValues}
                    ON CONFLICT (source_task_id, target_task_id, dependency_type) DO NOTHING
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
