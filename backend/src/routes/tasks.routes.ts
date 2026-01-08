import { Router } from 'express';
import * as tasksController from '../controllers/tasks.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

router.get('/objective/:objectiveId', tasksController.getTasksByObjective);
router.get('/', tasksController.getAllTasks);
router.get('/week/:weekNumber', tasksController.getTasksByWeek);
router.get('/project/:projectId', tasksController.getTasksByProject);
router.post('/', tasksController.createTask);
router.put('/:id', tasksController.updateTask);
router.patch('/:id/status', upload.single('evidence'), tasksController.updateTaskStatus);
router.patch('/:id/priority', tasksController.updateTaskPriority);
router.get('/:id/dependencies', tasksController.getTaskDependencies);
router.put('/:id/dependencies', tasksController.updateTaskDependencies);
router.delete('/:id', tasksController.deleteTask);

export default router;
