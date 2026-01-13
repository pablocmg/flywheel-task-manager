import { Request, Response } from 'express';
import * as db from '../db';

/**
 * Get current project settings (prefix and next task number)
 */
export const getProjectSettings = async (req: Request, res: Response) => {
    try {
        const query = 'SELECT * FROM project_settings LIMIT 1';
        const result = await db.query(query);

        if (result.rows.length === 0) {
            // If no settings exist, create default
            const insertQuery = `
                INSERT INTO project_settings (project_prefix, next_task_number)
                VALUES ('SDL', 1)
                RETURNING *
            `;
            const insertResult = await db.query(insertQuery);
            return res.json(insertResult.rows[0]);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching project settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Update project prefix
 * Note: Changing the prefix will affect ALL tasks since task_identifier is generated dynamically
 */
export const updateProjectSettings = async (req: Request, res: Response) => {
    const { project_prefix } = req.body;

    // Validate prefix format: exactly 3 uppercase letters
    if (!project_prefix || !/^[A-Z]{3}$/.test(project_prefix)) {
        return res.status(400).json({
            error: 'Invalid prefix format. Must be exactly 3 uppercase letters (e.g., SDL, PRJ, ABC)'
        });
    }

    try {
        const query = `
            UPDATE project_settings
            SET project_prefix = $1, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await db.query(query, [project_prefix]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project settings not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating project settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
