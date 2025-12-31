import { Request, Response } from 'express';
import * as db from '../db';

export const getProjects = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT p.*, 
            (SELECT json_agg(objective_id) FROM project_objectives po WHERE po.project_id = p.id) as objective_ids
            FROM projects p
            ORDER BY p.created_at DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getProjectsByObjective = async (req: Request, res: Response) => {
    const { objectiveId } = req.params;
    try {
        const query = `
            SELECT p.* 
            FROM projects p
            JOIN project_objectives po ON p.id = po.project_id
            WHERE po.objective_id = $1
            ORDER BY p.name ASC
        `;
        const result = await db.query(query, [objectiveId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching projects for objective:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createProject = async (req: Request, res: Response) => {
    const { name, description, status, objective_ids } = req.body;
    try {
        await db.query('BEGIN');

        const result = await db.query(
            'INSERT INTO projects (name, description, status) VALUES ($1, $2, $3) RETURNING *',
            [name, description, status || 'Active']
        );
        const project = result.rows[0];

        if (objective_ids && Array.isArray(objective_ids)) {
            for (const objId of objective_ids) {
                await db.query(
                    'INSERT INTO project_objectives (project_id, objective_id) VALUES ($1, $2)',
                    [project.id, objId]
                );
            }
        }

        await db.query('COMMIT');
        res.status(201).json(project);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, status, objective_ids } = req.body;
    try {
        await db.query('BEGIN');

        const result = await db.query(
            'UPDATE projects SET name = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [name, description, status, id]
        );

        if (result.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Project not found' });
        }

        if (objective_ids && Array.isArray(objective_ids)) {
            // Simple sync: delete all and re-add
            await db.query('DELETE FROM project_objectives WHERE project_id = $1', [id]);
            for (const objId of objective_ids) {
                await db.query(
                    'INSERT INTO project_objectives (project_id, objective_id) VALUES ($1, $2)',
                    [id, objId]
                );
            }
        }

        await db.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error updating project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
