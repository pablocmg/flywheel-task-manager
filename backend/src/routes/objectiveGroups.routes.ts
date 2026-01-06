import express from 'express';
import * as objectiveGroupsController from '../controllers/objectiveGroups.controller';

const router = express.Router();

router.get('/node/:nodeId', objectiveGroupsController.getGroupsByNode);
router.post('/', objectiveGroupsController.createGroup);
router.post('/:id/replicate', objectiveGroupsController.replicateGroup);
router.post('/node/:nodeId/replicate-all', objectiveGroupsController.replicateAllGroupsFromNode);
router.put('/:id', objectiveGroupsController.updateGroup);
router.delete('/node/:nodeId/all', objectiveGroupsController.deleteAllGroupsByNode);
router.delete('/:id', objectiveGroupsController.deleteGroup);

export default router;
