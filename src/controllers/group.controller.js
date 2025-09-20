import createHttpError from 'http-errors';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { autoAssignStudentToGroups } from '../services/roster.service.js';
import GroupMember from '../models/GroupMember.js';

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

    // 🔹 Create new group
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
      memberCount: 1, // lecturer is first member
    });

    // 🔹 Add creator to GroupMember
    await GroupMember.create({
      schoolId,
      groupId: group._id,
      userId: lecturerId,
      role: 'creator',
      joinMethod: 'manual-add',
      status: 'active',
      permissions: {
        canInvite: true,
        canRemove: true,
        canEdit: true,
      },
    });

    // 🔹 Update lecturer's profile
    lecturer.createdGroups = lecturer.createdGroups || [];
    if (!lecturer.createdGroups.includes(group._id)) {
      lecturer.createdGroups.push(group._id);
    }
    await lecturer.save();

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      group,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(
        createHttpError(
          409,
          `You already created a group for ${courseCode} (${department}, ${faculty}, ${level}) in this school`
        )
      );
    }
    return next(error);
  }
};

export const groupAssignment = async (req, res, next) => {
  try {
    const userId = req.user._id;

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
};

export const getMyGroups = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw createHttpError(401, 'Unauthorized: no user found in request');
    }

    // 🔹 Get memberships
    const memberships = await GroupMember.find({
      userId,
      status: 'active',
    })
      .populate({
        path: 'groupId',
        populate: [
          { path: 'createdBy', select: 'firstName lastName email' },
          { path: 'schoolId', select: 'name' },
          { path: 'studentsRosterId', select: 'fileName students' },
        ],
      })
      .lean();

    // 🔹 Format result
    const groups = memberships
      .map((m) => {
        if (!m.groupId) return null;

        const group = { ...m.groupId };

        // Attach membership info
        group.myMembership = {
          role: m.role,
          status: m.status,
          permissions: m.permissions,
        };

        if (m.role !== 'creator') {
          delete group.studentsRosterId;
        }

        return group;
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      count: groups.length,
      groups,
    });
  } catch (error) {
    next(error);
  }
};
