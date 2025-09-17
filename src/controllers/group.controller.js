import createHttpError from 'http-errors';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { autoAssignStudentToGroups } from '../services/roster.service.js';

export const createGroup = async (req, res, next) => {
  try {
    const {
      name,
      courseCode,
      level,
      department,
      faculty,
      description,
      schoolId,
    } = req.body;

    const lecturerId = req.user?._id;
    if (!lecturerId) throw createHttpError(401, 'Unauthorized');

    const lecturer = await User.findById(lecturerId);
    if (!lecturer || lecturer.role !== 'lecturer') {
      throw createHttpError(403, 'Only lecturers can create groups');
    }

    const group = await Group.create({
      name,
      courseCode,
      level,
      department,
      faculty,
      description,
      createdBy: lecturerId,
      studentsRosterId: null,
      schoolId,
    });

    lecturer.createdGroups = lecturer.createdGroups || [];
    lecturer.createdGroups.push(group._id);
    await lecturer.save();

    res
      .status(201)
      .json({ success: true, message: 'Group created successfully', group });
  } catch (error) {
    if (error.code === 11000) {
      return next(
        createHttpError(
          409,
          `You already created a group for ${courseCode} (${department}, ${faculty}, ${level}) in this school`
        )
      );
    }
    return next(createHttpError(500, 'Group creation failed'));
  }
};

export const groupAssignment = async (req, res, next) => {
  try {
    const userId = req.user._id; // or req.body / req.user depending on auth

    console.log('reached')

    if (!userId) {
      throw createHttpError(400, 'User ID is required');
    }

    const student = await User.findById(userId);
    if (!student) {
      throw createHttpError(404, 'Student not found');
    }
    if (student.role !== 'student') {
      throw createHttpError(403, 'Only students can be auto-assigned');
    }

    const result = await autoAssignStudentToGroups(userId);

    if (!result.success) {
      throw createHttpError(500, result.error || 'Auto-assignment failed');
    }

    res.status(200).json({
      success: true,
      message: result.message,
      newAssignments: result.newAssignments,
      assignments: result.assignments,
    });
  } catch (error) {
    next(error);
  }
}

export const getMyGroups = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw createHttpError(401, 'Unauthorized: no user found in request');
    }

    const groups = await Group.find({
      $or: [{ createdBy: userId }, { members: userId }],
    })
      .populate('createdBy', 'firstName lastName email')
      .populate('schoolId', 'name')
      .populate('studentsRosterId', 'fileName students')
      .lean();

    res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    next(error);
  }
};
