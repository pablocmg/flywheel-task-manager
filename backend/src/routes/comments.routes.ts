import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import {
    getTaskComments,
    createComment,
    updateComment,
    deleteComment,
    getTaskDeliverables,
    addDeliverable,
    removeDeliverable,
    promoteToDeliverable,
    canMarkAsDone
} from '../controllers/comments.controller';

const router = Router();

// Comments routes (nested under /api/tasks/:taskId)
router.get('/:taskId/comments', getTaskComments);
router.post('/:taskId/comments', createComment);
router.put('/comments/:id', updateComment);
router.delete('/comments/:id', deleteComment);

// Deliverables routes
router.get('/:taskId/deliverables', getTaskDeliverables);
router.post('/:taskId/deliverables', addDeliverable);
router.delete('/:taskId/deliverables/:index', removeDeliverable);
router.post('/:taskId/deliverables/promote', promoteToDeliverable);

// Validation route
router.get('/:taskId/can-complete', canMarkAsDone);

// File upload route for attachments
router.post('/:taskId/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // In production, you'd upload to cloud storage (S3, etc.)
    // For now, return local path
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
        url: fileUrl,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size
    });
});

export default router;
