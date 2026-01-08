import { Request, Response } from 'express';
import * as db from '../db';

export const getKeyResultsByObjective = async (req: Request, res: Response) => {
    const { objectiveId } = req.params;
    try {
        const result = await db.query('SELECT * FROM key_results WHERE objective_id = $1 ORDER BY display_order ASC, created_at ASC', [objectiveId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching key results:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createKeyResult = async (req: Request, res: Response) => {
    const { objective_id, description, target_value, current_value } = req.body;
    try {
        // Check for duplicate description within the same objective
        const duplicateCheck = await db.query(
            'SELECT id FROM key_results WHERE objective_id = $1 AND LOWER(TRIM(description)) = LOWER(TRIM($2))',
            [objective_id, description]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Ya existe un resultado clave con ese nombre en este objetivo' });
        }

        // Get max display_order for this objective
        const maxOrderResult = await db.query(
            'SELECT COALESCE(MAX(display_order), -1) as max_order FROM key_results WHERE objective_id = $1',
            [objective_id]
        );
        const nextOrder = maxOrderResult.rows[0].max_order + 1;

        const result = await db.query(
            'INSERT INTO key_results (objective_id, description, target_value, current_value, display_order) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [objective_id, description, target_value || 100, current_value || 0, nextOrder]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating key result:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateKeyResult = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description, target_value, current_value } = req.body;
    try {
        const result = await db.query(
            'UPDATE key_results SET description = $1, target_value = $2, current_value = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [description, target_value, current_value, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Key result not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating key result:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteKeyResult = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM key_results WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Key result not found' });
        }
        res.json({ message: 'Key result deleted successfully' });
    } catch (error) {
        console.error('Error deleting key result:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateKeyResultOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { display_order } = req.body;

    try {
        await db.query(
            'UPDATE key_results SET display_order = $1 WHERE id = $2',
            [display_order, id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating key result order:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
