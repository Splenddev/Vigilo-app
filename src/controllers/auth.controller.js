import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js'; // your email helper
import { validationResult } from 'express-validator';
import { generateOTP, getEmailTemplate } from '../utils/otpUtils.js';

// --- REGISTER ---
export const registerUser = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      faculty,
      level,
    } = req.body;
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !role ||
      !department ||
      !faculty ||
      (role === 'student' && !level)
    )
      throw createHttpError(400, 'All fields are required');

    const existing = await User.findOne({ email });
    if (existing) throw createHttpError(409, 'Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      department,
      faculty,
      level,
      role,
      otp,
      otpExpiry,
      isVerified: false,
    });

    const template = getEmailTemplate(otp, 'email_verification');
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      userId: user._id,
    });
  } catch (error) {
    next(error);
  }
};

export const requestOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { email, purpose = 'email_verification' } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    // Prevent re-sending OTP if existing OTP is still valid
    if (user.otpExpiry && user.otpExpiry > new Date())
      return res.status(429).json({
        success: false,
        message: 'OTP already sent. Wait until it expires.',
      });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to DB
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    const template = getEmailTemplate(otp, purpose);
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
    });

    if (process.env.NODE_ENV === 'development')
      console.log(`OTP for ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 600,
    });
  } catch (err) {
    console.error('OTP Request Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
};

// ===== Verify OTP =====
export const verifyOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date())
      return res
        .status(400)
        .json({ success: false, message: 'OTP expired. Request a new one.' });

    if (user.otp !== otp)
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });

    // OTP verified successfully
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error('OTP Verify Error:', err);
    res
      .status(500)
      .json({ success: false, message: 'OTP verification failed' });
  }
};

// --- LOGIN ---
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      throw createHttpError(
        400,
        'Both email and password are required to sign in.'
      );

    const user = await User.findOne({ email });
    if (!user)
      throw createHttpError(
        401,
        'No account found with this email address. Please register first.'
      );

    if (!user.isVerified)
      throw createHttpError(
        403,
        'Your account has not been verified. Please check your email for the verification code.'
      );

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      throw createHttpError(
        401,
        'The password you entered is incorrect. Please try again or reset your password.'
      );

    // Convert to plain object
    const plainUser = user.toObject();

    // Remove sensitive / unnecessary fields
    delete plainUser.password;
    delete plainUser.otp;
    delete plainUser.otpExpiry;
    delete plainUser.__v;

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Send JWT as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: plainUser,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await User.updateOne({ refreshToken }, { $unset: { refreshToken: '' } });
    }

    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(createHttpError(500, 'Logout failed'));
  }
};
// --- LOGOUT ---
