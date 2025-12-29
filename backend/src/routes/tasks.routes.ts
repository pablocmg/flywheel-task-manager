import { Router } from 'express';
import * as tasksController from '../controllers/tasks.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/objective/:objectiveId', tasksController.getTasksByObjective);
router.get('/week/:weekNumber', tasksController.getTasksByWeek);
router.post('/', tasksController.createTask);
router.patch('/:id/status', upload.single('evidence'), tasksController.updateTaskStatus);
router.patch('/:id/priority', tasksController.updateTaskPriority);

export default router;
