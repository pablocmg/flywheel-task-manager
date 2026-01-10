import { Router } from 'express';
import * as assigneesController from '../controllers/assignees.controller';

const router = Router();

router.get('/', assigneesController.getAllAssignees);
router.post('/get-or-create', assigneesController.getOrCreateAssignee);

export default router;
