// controllers/admin.controller.js
import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import User from '../models/User.js';

export const createAdmin = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      throw createHttpError(400, 'First and last name are required');
    }
    if (!email) throw createHttpError(400, 'Email is required');
    if (!password || password.length < 8) {
      throw createHttpError(400, 'Password must be at least 8 characters long');
    }

    // Check if there is already a SUPER_ADMIN
    const superAdminExists = await User.findOne({ role: 'super_admin' });

    if (!superAdminExists) {
      // Bootstrap: first admin = SUPER_ADMIN
      const hashedPassword = await bcrypt.hash(password, 10);

      const superAdmin = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: 'super_admin',
        status: 'active',
      });

      return res.status(201).json({
        message: 'Super Admin created successfully',
        user: {
          id: superAdmin._id,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          email: superAdmin.email,
          role: superAdmin.role,
        },
      });
    }

    // Otherwise, must be SUPER_ADMIN to create more admins
    if (!req.user || req.user.role !== 'super_admin') {
      throw createHttpError(403, 'Only Super Admin can create more admins');
    }

    // Prevent duplicates
    const existingUser = await User.findOne({ email });
    if (existingUser) throw createHttpError(409, 'User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'admin',
      status: 'active',
    });

    res.status(201).json({
      message: 'Admin created successfully',
      user: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
