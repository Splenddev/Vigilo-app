import express from 'express';
import { protect } from '../middleware/protect.js';
import { authorize } from '../middleware/authorize.js';
import { ROLES } from '../utils/roles.js';
import { getAllStudentsForLecturer } from '../controllers/lecturer.controller.js';

const router = express.Router();

router.use(protect);
router.use(authorize([ROLES.LECTURER]));

router.get('/students', getAllStudentsForLecturer);

export default router;
