import { Router } from 'express';
import * as keyResultsController from '../controllers/key_results.controller';

const router = Router();

router.get('/objective/:objectiveId', keyResultsController.getKeyResultsByObjective);
router.post('/', keyResultsController.createKeyResult);
router.put('/:id', keyResultsController.updateKeyResult);
router.patch('/:id/order', keyResultsController.updateKeyResultOrder);
router.delete('/:id', keyResultsController.deleteKeyResult);

export default router;
