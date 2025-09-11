import School from '../models/School.js';
import createHttpError from 'http-errors';

/**
 * @desc Create new school
 * @route POST /api/schools
 * @access Private (admin)
 */
export const createSchool = async (req, res, next) => {
  try {
    const { name, faculty, departments, code } = req.body;

    if (!name) {
      throw createHttpError(400, 'School name is required');
    }

    const school = await School.create({
      name,
      faculty: faculty || [],
      code,
      departments: departments || [],
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: school,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get all schools
 * @route GET /api/schools
 * @access Private (admin, lecturer)
 */
export const getSchools = async (req, res, next) => {
  try {
    const schools = await School.find();
    res.status(200).json({ success: true, data: schools });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get single school by id
 * @route GET /api/schools/:id
 * @access Private
 */
export const getSchoolById = async (req, res, next) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      throw createHttpError(404, 'School not found');
    }

    res.status(200).json({ success: true, data: school });
  } catch (err) {
    next(err);
  }
};
