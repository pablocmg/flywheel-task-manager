import { Router } from 'express';
import * as objectivesController from '../controllers/objectives.controller';

const router = Router();

router.get('/node/:nodeId', objectivesController.getObjectivesByNode);
router.post('/', objectivesController.createObjective);
router.put('/:id', objectivesController.updateObjective);
router.delete('/:id', objectivesController.deleteObjective);

export default router;
