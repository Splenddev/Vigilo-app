import { Router } from 'express';
import {
  registerUser,
  loginUser,
  requestOTP,
} from '../controllers/auth.controller.js';
import { verifyOTP } from '../controllers/auth.controller.js';
import { logout } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logout);
router.post('/otp/request', requestOTP);
router.post('/otp/verify', verifyOTP);

export default router;
