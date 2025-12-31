import { Router } from 'express';
import * as projectsController from '../controllers/projects.controller';

const router = Router();

router.get('/', projectsController.getProjects);
router.get('/objective/:objectiveId', projectsController.getProjectsByObjective);
router.post('/', projectsController.createProject);
router.put('/:id', projectsController.updateProject);
router.delete('/:id', projectsController.deleteProject);

export default router;
