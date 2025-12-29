import { Router } from 'express';
import * as tasksController from '../controllers/tasks.controller';

const router = Router();

router.get('/objective/:objectiveId', tasksController.getTasksByObjective);
router.get('/week/:weekNumber', tasksController.getTasksByWeek);
router.post('/', tasksController.createTask);
router.patch('/:id/status', tasksController.updateTaskStatus);
// router.put('/:id/priority', tasksController.updateTaskPriority);

export default router;
