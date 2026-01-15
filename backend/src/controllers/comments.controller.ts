import { Request, Response } from 'express';
import * as db from '../db';

// Get all comments for a task
export const getTaskComments = async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        const result = await db.query(`
            SELECT id, task_id, user_id, user_name, content, attachments, created_at, updated_at
            FROM task_comments
            WHERE task_id = $1
            ORDER BY created_at ASC
        `, [taskId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching task comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
};

// Create a new comment
export const createComment = async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const { content, user_name, attachments = [] } = req.body;

        if (!content && attachments.length === 0) {
            return res.status(400).json({ error: 'Comment must have content or attachments' });
        }

        const result = await db.query(`
            INSERT INTO task_comments (task_id, user_name, content, attachments)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [taskId, user_name || 'Anonymous', content || '', JSON.stringify(attachments)]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
};

// Update a comment
export const updateComment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const result = await db.query(`
            UPDATE task_comments 
            SET content = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [content, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ error: 'Failed to update comment' });
    }
};

// Delete a comment
export const deleteComment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            DELETE FROM task_comments WHERE id = $1 RETURNING id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        res.json({ message: 'Comment deleted', id: result.rows[0].id });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};

// Get deliverables for a task
export const getTaskDeliverables = async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        const result = await db.query(`
            SELECT final_deliverables FROM tasks WHERE id = $1
        `, [taskId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(result.rows[0].final_deliverables || []);
    } catch (error) {
        console.error('Error fetching deliverables:', error);
        res.status(500).json({ error: 'Failed to fetch deliverables' });
    }
};

// Add a deliverable to a task
export const addDeliverable = async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const { type, url, title, thumbnail, added_by, promoted_from_comment_id } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'Deliverable must have a URL' });
        }

        const deliverable = {
            type: type || 'link',
            url,
            title: title || url,
            thumbnail: thumbnail || null,
            added_by: added_by || null,
            promoted_from_comment_id: promoted_from_comment_id || null,
            added_at: new Date().toISOString()
        };

        const result = await db.query(`
            UPDATE tasks 
            SET final_deliverables = COALESCE(final_deliverables, '[]'::jsonb) || $2::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING final_deliverables
        `, [taskId, JSON.stringify(deliverable)]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.status(201).json(result.rows[0].final_deliverables);
    } catch (error) {
        console.error('Error adding deliverable:', error);
        res.status(500).json({ error: 'Failed to add deliverable' });
    }
};

// Remove a deliverable from a task
export const removeDeliverable = async (req: Request, res: Response) => {
    try {
        const { taskId, index } = req.params;
        const idx = parseInt(String(index), 10);

        // Get current deliverables
        const current = await db.query(`
            SELECT final_deliverables FROM tasks WHERE id = $1
        `, [taskId]);

        if (current.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const deliverables = current.rows[0].final_deliverables || [];

        if (idx < 0 || idx >= deliverables.length) {
            return res.status(400).json({ error: 'Invalid deliverable index' });
        }

        // Remove the item at index
        deliverables.splice(idx, 1);

        const result = await db.query(`
            UPDATE tasks 
            SET final_deliverables = $2::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING final_deliverables
        `, [taskId, JSON.stringify(deliverables)]);

        res.json(result.rows[0].final_deliverables);
    } catch (error) {
        console.error('Error removing deliverable:', error);
        res.status(500).json({ error: 'Failed to remove deliverable' });
    }
};

// Promote an attachment from a comment to a deliverable
export const promoteToDeliverable = async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;
        const { comment_id, attachment_index, added_by } = req.body;

        // Get the comment
        const comment = await db.query(`
            SELECT attachments FROM task_comments WHERE id = $1 AND task_id = $2
        `, [comment_id, taskId]);

        if (comment.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const attachments = comment.rows[0].attachments || [];

        if (attachment_index < 0 || attachment_index >= attachments.length) {
            return res.status(400).json({ error: 'Invalid attachment index' });
        }

        const attachment = attachments[attachment_index];

        // Create deliverable from attachment
        const deliverable = {
            type: attachment.type || 'file',
            url: attachment.url,
            title: attachment.name || attachment.url,
            thumbnail: attachment.thumbnail || null,
            added_by: added_by || null,
            promoted_from_comment_id: comment_id,
            added_at: new Date().toISOString()
        };

        // Add to task deliverables
        const result = await db.query(`
            UPDATE tasks 
            SET final_deliverables = COALESCE(final_deliverables, '[]'::jsonb) || $2::jsonb,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING final_deliverables
        `, [taskId, JSON.stringify(deliverable)]);

        res.status(201).json({
            deliverables: result.rows[0].final_deliverables,
            promoted: deliverable
        });
    } catch (error) {
        console.error('Error promoting to deliverable:', error);
        res.status(500).json({ error: 'Failed to promote to deliverable' });
    }
};

// Check if task can be marked as Done (has deliverables)
export const canMarkAsDone = async (req: Request, res: Response) => {
    try {
        const { taskId } = req.params;

        const result = await db.query(`
            SELECT final_deliverables FROM tasks WHERE id = $1
        `, [taskId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const deliverables = result.rows[0].final_deliverables || [];
        const canComplete = deliverables.length > 0;

        res.json({
            canComplete,
            deliverableCount: deliverables.length,
            message: canComplete ? 'Task can be completed' : 'Task requires at least one deliverable'
        });
    } catch (error) {
        console.error('Error checking task completion:', error);
        res.status(500).json({ error: 'Failed to check task completion' });
    }
};
