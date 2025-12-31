import { Router } from 'express';
import * as interactionsController from '../controllers/interactions.controller';

const router = Router();

router.get('/', interactionsController.getInteractions);
router.post('/', interactionsController.createInteraction);
router.delete('/:id', interactionsController.deleteInteraction);

export default router;
