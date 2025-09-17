import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
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
      matricNumber,
      schoolId,
    } = req.body;

    // --- Validation ---
    if (!firstName || !lastName || !email || !schoolId || !password || !role) {
      return next(createHttpError(400, 'Required fields are missing.'));
    }

    if (role === 'student' && (!level || !matricNumber)) {
      return next(
        createHttpError(
          400,
          'Students must provide level and matriculation number.'
        )
      );
    }

    // --- Check Email ---
    const existing = await User.findOne({ email });
    if (existing) {
      return next(createHttpError(409, 'Email is already registered.'));
    }

    // --- Check Matric Number for Students ---
    if (role === 'student') {
      const existingMatric = await User.findOne({
        matricNumber,
        schoolId,
      });
      if (existingMatric) {
        return next(
          createHttpError(
            409,
            'This matriculation number is already registered in your school.'
          )
        );
      }
    }

    // --- Password Hashing ---
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- OTP Generation ---
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // --- User Creation ---
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      department,
      faculty,
      level: role === 'student' ? level : undefined,
      role,
      otp,
      otpExpiry,
      matricNumber: role === 'student' ? matricNumber : undefined,
      schoolId,
      isVerified: role === 'super_admin' ? true : false,
    });


    // --- Send Verification Email ---
    if (role !== 'super_admin') {
      const template = getEmailTemplate(otp, 'email_verification');
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    }

    // --- Response ---
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      meta: {
        isNewStudent: role === 'student',
      },
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
    if (!email || !password) {
      throw createHttpError(
        400,
        'Both email and password are required to sign in.'
      );
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw createHttpError(
        401,
        'No account found with this email address. Please register first.'
      );
    }

    if (user.role !== 'super_admin' && !user.isVerified) {
      throw createHttpError(
        403,
        'Your account has not been verified. Please check your email for the verification code.'
      );
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw createHttpError(
        401,
        'The password you entered is incorrect. Please try again or reset your password.'
      );
    }

    if (!process.env.JWT_SECRET) {
      throw createHttpError(500, 'JWT secret is not configured on the server');
    }

    // Convert to safe object
    const { password: pw, otp, otpExpiry, __v, ...safeUser } = user.toObject();

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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: safeUser,
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
