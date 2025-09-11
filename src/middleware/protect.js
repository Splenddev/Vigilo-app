import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Get token from headers or cookies
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw createHttpError(401, 'Not authorized, no token provided');
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      throw createHttpError(401, 'Not authorized, invalid token');
    }

    // 3. Attach user (without password) to req
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      throw createHttpError(401, 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createHttpError(401, 'Not authorized, invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createHttpError(401, 'Token expired, please log in again'));
    }
    next(error);
  }
};
