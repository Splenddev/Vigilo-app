import { body, validationResult } from 'express-validator';

// ===== Validation =====
export const validateOtpRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('purpose')
    .optional()
    .isIn(['email_verification', 'password_reset', 'login_verification'])
    .withMessage('Invalid OTP purpose'),
];

export const validateOtpVerify = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
];
