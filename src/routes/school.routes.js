import express from 'express';
import {
  createSchool,
  getSchools,
  getSchoolById,
} from '../controllers/school.controller.js';
import { protect } from '../middleware/protect.js';

const router = express.Router();

router.use(protect);
// /api/schools
router.post('/', createSchool);
router.get('/', getSchools);

router.route('/:id').get(protect, getSchoolById);

export default router;
