import express from 'express';
import {
  createSchool,
  getSchools,
  getSchoolById,
} from '../controllers/school.controller.js';
import { protect } from '../middleware/protect.js';

const router = express.Router();

router.post('/', protect, createSchool);
router.get('/', getSchools);
router.get('/:id', protect, getSchoolById);

export default router;
