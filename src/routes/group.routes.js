import express from 'express';
import { protect } from '../middleware/protect.js';
import { createGroup } from '../controllers/group.controller.js';

const router = express.Router();

router.use(protect);

router.post('/create', createGroup);

export default router;
