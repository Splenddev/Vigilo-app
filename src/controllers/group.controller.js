import createHttpError from 'http-errors';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { autoAssignStudentToGroups } from '../services/roster.service.js';
import GroupMember from '../models/GroupMember.js';
import { sendNotification } from '../utils/notifications.js';

export const createGroup = async (req, res, next) => {
  const {
    name,
    courseCode,
    level,
    venue,
    department,
    faculty,
    description,
    schoolId,
  } = req.body;
  try {
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
      venue,
      department,
      faculty,
      description,
      createdBy: lecturerId,
      studentsRosterId: null,
      schoolId,
      memberCount: 1,
    });

    // 🔹 Add creator to GroupMember
    await GroupMember.create({
      schoolId,
      groupId: group._id,
      userId: lecturerId,
      role: 'creator',
      type: 'lecturer',
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

    // 🔹 Send notification (self + maybe admins)
    await sendNotification({
      sender: lecturerId,
      recipients: [
        {
          userId: lecturerId,
          role: 'lecturer',
        },
      ],
      type: 'group_created',
      title: `Group Created: ${name}`,
      message: `You have successfully created the group "${name}" for ${courseCode} (${level} – ${department}, ${faculty}).`,
      groupId: group._id,
      category: 'academic',
      metadata: {
        courseCode,
        level,
        department,
        faculty,
        schoolId,
      },
    });

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
          {
            path: 'studentsRosterId',
            select: 'fileName students session',
          },
        ],
      })
      .lean();

    // 🔹 Format result
    const groups = await Promise.all(
      memberships.map(async (m) => {
        if (!m.groupId) return null;

        const group = { ...m.groupId };

        // Attach membership info
        group.myMembership = {
          type: m.type,
          role: m.role,
          status: m.status,
          permissions: m.permissions,
        };

        if (group.studentsRosterId) {
          group.session = group.studentsRosterId.session;

          if (m.type !== 'lecturer') {
            delete group.studentsRosterId.students;
            delete group.studentsRosterId.fileName;
          }
        }

        const [studentCount, lecturerCount] = await Promise.all([
          GroupMember.countDocuments({
            groupId: group._id,
            type: 'student',
            status: 'active',
          }),
          GroupMember.countDocuments({
            groupId: group._id,
            type: 'lecturer',
            status: 'active',
          }),
        ]);

        group.studentCount = studentCount;
        group.lecturerCount = lecturerCount;

        return group;
      })
    );

    res.status(200).json({
      success: true,
      count: groups.length,
      groups: groups.filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};
