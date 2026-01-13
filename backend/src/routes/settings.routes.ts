import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

// GET /api/settings - Get project settings
router.get('/', settingsController.getProjectSettings);

// PUT /api/settings - Update project settings
router.put('/', settingsController.updateProjectSettings);

export default router;
