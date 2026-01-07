import { Request, Response } from 'express';
import * as db from '../db';

export const getGroupsByNode = async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    try {
        const query = `
            SELECT og.*,
            COALESCE(
                (SELECT json_agg(
                    json_build_object(
                        'id', o.id,
                        'description', o.description,
                        'group_id', o.group_id,
                        'key_results', COALESCE(
                            (SELECT json_agg(kr.* ORDER BY kr.created_at ASC)
                             FROM key_results kr
                             WHERE kr.objective_id = o.id),
                            '[]'
                        )
                    )
                    ORDER BY o.created_at ASC
                )
                FROM objectives o
                WHERE o.group_id = og.id),
                '[]'
            ) as objectives
            FROM objective_groups og
            WHERE og.node_id = $1
            ORDER BY og.target_date ASC NULLS LAST, og.created_at DESC
        `;
        const result = await db.query(query, [nodeId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching objective periods:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createGroup = async (req: Request, res: Response) => {
    const { node_id, alias, target_date } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO objective_groups (node_id, alias, target_date) VALUES ($1, $2, $3) RETURNING *',
            [node_id, alias, target_date || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating objective period:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateGroup = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { alias, target_date } = req.body;
    try {
        const result = await db.query(
            'UPDATE objective_groups SET alias = $1, target_date = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [alias, target_date, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Objective period not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating objective period:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM objective_groups WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Objective period not found' });
        }
        res.json({ message: 'Objective period deleted successfully' });
    } catch (error) {
        console.error('Error deleting objective period:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const replicateGroup = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Get the source group (only alias and target_date)
        const sourceGroup = await db.query('SELECT * FROM objective_groups WHERE id = $1', [id]);
        if (sourceGroup.rows.length === 0) {
            return res.status(404).json({ error: 'Objective period not found' });
        }

        const { alias, target_date, node_id } = sourceGroup.rows[0];

        // Get all other nodes (excluding the source node)
        const otherNodes = await db.query('SELECT id FROM nodes WHERE id != $1', [node_id]);

        if (otherNodes.rows.length === 0) {
            return res.status(400).json({ error: 'No other nodes to replicate to' });
        }

        // Create empty groups in all other nodes (no objectives, no KRs) if they don't exist
        const createdGroups = [];
        for (const node of otherNodes.rows) {
            const result = await db.query(
                `INSERT INTO objective_groups (node_id, alias, target_date)
                 SELECT $1, $2, $3
                 WHERE NOT EXISTS (
                     SELECT 1 FROM objective_groups 
                     WHERE node_id = $1 AND alias = $2
                 )
                 RETURNING *`,
                [node.id, alias, target_date]
            );
            if (result.rows.length > 0) {
                createdGroups.push(result.rows[0]);
            }
        }

        res.json({
            message: `Period replicated to ${createdGroups.length} node(s)`,
            createdGroups
        });
    } catch (error) {
        console.error('Error replicating objective period:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteAllGroupsByNode = async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    try {
        // Get count of groups to be deleted
        const countResult = await db.query('SELECT COUNT(*) FROM objective_groups WHERE node_id = $1', [nodeId]);
        const count = parseInt(countResult.rows[0].count);

        if (count === 0) {
            return res.status(404).json({ error: 'No objective periods found for this node' });
        }

        // Delete all groups for this node (cascading will handle objectives, KRs, and tasks)
        await db.query('DELETE FROM objective_groups WHERE node_id = $1', [nodeId]);

        res.json({
            message: `Successfully deleted ${count} objective period(s) from node`,
            deletedCount: count
        });
    } catch (error) {
        console.error('Error deleting all objective periods:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const replicateAllGroupsFromNode = async (req: Request, res: Response) => {
    const { nodeId } = req.params;
    try {
        // Get all groups for the source node
        const groupsResult = await db.query('SELECT alias, target_date FROM objective_groups WHERE node_id = $1', [nodeId]);
        const groups = groupsResult.rows;

        if (groups.length === 0) {
            return res.status(404).json({ error: 'No objective periods found to replicate' });
        }

        // Get all other nodes
        const otherNodesResult = await db.query('SELECT id FROM nodes WHERE id != $1', [nodeId]);
        const otherNodes = otherNodesResult.rows;

        if (otherNodes.length === 0) {
            return res.status(400).json({ error: 'No other nodes to replicate to' });
        }

        let totalCreated = 0;

        // Use a transaction for reliability if possible, or just loop
        for (const targetNode of otherNodes) {
            for (const group of groups) {
                const result = await db.query(
                    `INSERT INTO objective_groups (node_id, alias, target_date)
                     SELECT $1, $2, $3
                     WHERE NOT EXISTS (
                         SELECT 1 FROM objective_groups 
                         WHERE node_id = $1 AND alias = $2
                     )
                     RETURNING *`,
                    [targetNode.id, group.alias, group.target_date]
                );
                if (result.rows.length > 0) {
                    totalCreated++;
                }
            }
        }

        res.json({
            message: `Replicated ${groups.length} period(s) to ${otherNodes.length} node(s).`,
            totalCreated
        });
    } catch (error) {
        console.error('Error replicating all objective periods:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


