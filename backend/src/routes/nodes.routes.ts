import { Router } from 'express';
import * as nodesController from '../controllers/nodes.controller';

const router = Router();

router.get('/', nodesController.getAllNodes);
router.post('/', nodesController.createNode);
router.get('/:id', nodesController.getNodeById);
router.put('/:id', nodesController.updateNode);
router.delete('/:id', nodesController.deleteNode);

export default router;
