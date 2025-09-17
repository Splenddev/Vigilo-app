import express from 'express';
import { protect } from '../middleware/protect.js';
import { createGroup, getMyGroups, groupAssignment } from '../controllers/group.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyGroups);
router.post('/create', createGroup);
router.post('/assign', groupAssignment);

export default router;
