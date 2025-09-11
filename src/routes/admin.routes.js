// routes/admin.routes.js
import express from 'express';
import { createAdmin } from '../controllers/admin.controller.js';
import { protect } from '../middleware/protect.js';

const router = express.Router();

router.post('/add', protect, createAdmin);

export default router;
