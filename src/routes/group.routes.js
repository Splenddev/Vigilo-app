import express from 'express';
import { protect } from '../middleware/protect.js';
import { createGroup, getMyGroups } from '../controllers/group.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyGroups);
router.post('/create', createGroup);

export default router;
