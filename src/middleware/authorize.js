import createHttpError from 'http-errors';

export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(createHttpError(403, 'Forbidden: insufficient role'));
    }
    next();
  };
};
