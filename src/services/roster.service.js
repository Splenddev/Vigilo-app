import User from '../models/User.js';
import Roster from '../models/Rooster.js';
import Group from '../models/Group.js';
import GroupMember from '../models/GroupMember.js';
import { notifyAutoAssignment } from '../utils/notifications.js';

export const autoAssignStudentToGroups = async (userId) => {
  try {
    const student = await User.findById(userId);
    if (!student || student.role !== 'student') {
      return { success: false, error: 'Invalid student' };
    }

    // Fetch all rosters in the student's school
    const rosters = await Roster.find({
      schoolId: student.schoolId,
    }).populate(
      'groupId uploadedBy',
      'name courseCode level department faculty firstName lastName status'
    );

    if (!rosters.length) {
      return {
        success: true,
        message: 'No rosters found in school',
        assignments: [],
      };
    }

    const assignments = [];

    // Get student's existing group memberships
    const existingMemberships = await GroupMember.find({ userId: student._id })
      .select('groupId')
      .lean();

    const currentGroupIds = new Set(
      existingMemberships.map((m) => m.groupId.toString())
    );

    // Loop through rosters to find matches
    for (const roster of rosters) {
      // Skip if group inactive
      if (!roster.groupId || roster.groupId.status !== 'active') continue;

      // Skip if student already in this group
      if (currentGroupIds.has(roster.groupId._id.toString())) continue;

      // Try to match student in roster
      const matchedStudent = roster.students.find((rosterStudent) => {
        let isMatch = false;

        if (
          roster.matchStrategy.includes('matricNumber') &&
          student.matricNumber &&
          rosterStudent.matricNumber &&
          student.matricNumber.toLowerCase() ===
            rosterStudent.matricNumber.toLowerCase()
        ) {
          isMatch = true;
        }

        if (
          !isMatch &&
          roster.matchStrategy.includes('email') &&
          student.email &&
          rosterStudent.email &&
          student.email.toLowerCase() === rosterStudent.email.toLowerCase()
        ) {
          isMatch = true;
        }

        return isMatch;
      });

      if (!matchedStudent) continue;

      try {
        // ✅ Update roster student entry
        await Roster.findOneAndUpdate(
          { _id: roster._id, 'students._id': matchedStudent._id },
          {
            $set: {
              'students.$.hasJoined': true,
              'students.$.isInvited': true,
              'students.$.firstName': student.firstName,
              'students.$.lastName': student.lastName,
              'students.$.email': student.email,
            },
          }
        );

        const membership = await GroupMember.findOneAndUpdate(
          { groupId: roster.groupId._id, userId: student._id },
          {
            $setOnInsert: {
              schoolId: student.schoolId,
              role: 'member',
              joinMethod: 'roster',
              status: 'active',
              joinedAt: new Date(),
              invitedBy: null,
            },
          },
          { upsert: true, new: true }
        );

        // ✅ Increment group member count only if new
        if (membership.isNew) {
          await Group.findByIdAndUpdate(roster.groupId._id, {
            $inc: { memberCount: 1 },
          });
        }

        // ✅ Push assignment info
        assignments.push({
          groupId: roster.groupId._id,
          groupName: roster.groupId.name,
          courseCode: roster.groupId.courseCode,
          level: roster.groupId.level,
          department: roster.groupId.department,
          matchType:
            student.matricNumber &&
            matchedStudent.matricNumber &&
            student.matricNumber.toLowerCase() ===
              matchedStudent.matricNumber.toLowerCase()
              ? 'matricNumber'
              : 'email',
          lecturer: `${roster.uploadedBy.firstName} ${roster.uploadedBy.lastName}`,
          rosterId: roster._id,
        });

        currentGroupIds.add(roster.groupId._id.toString());
      } catch (error) {
        console.error(
          `Failed to assign student to group ${roster.groupId._id}:`,
          error
        );
      }
    }

    if (assignments.length > 0) {
      await notifyAutoAssignment({ student, assignments });
    }

    return {
      success: true,
      message:
        assignments.length > 0
          ? `Automatically assigned to ${assignments.length} group(s)`
          : 'No new assignments made',
      assignments,
      newAssignments: assignments.length,
    };
  } catch (error) {
    console.error('Error in auto-assignment:', error);
    return { success: false, error: error.message };
  }
};

export const getStudentAssignmentStatus = async (userId) => {
  try {
    const student = await User.findById(userId).select(
      'firstName lastName matricNumber joinedGroups'
    );

    if (!student || student.role !== 'student') {
      throw new Error('Invalid student');
    }

    const groupCount = student.joinedGroups ? student.joinedGroups.length : 0;

    return {
      isAssigned: groupCount > 0,
      assignmentCount: groupCount,
      needsCheck: groupCount === 0, // Flag to run auto-assignment
      studentInfo: {
        name: `${student.firstName} ${student.lastName}`,
        matricNumber: student.matricNumber,
      },
    };
  } catch (error) {
    console.error('Error getting assignment status:', error);
    throw error;
  }
};

export const batchAutoAssignStudents = async (schoolId) => {
  try {
    // Find all unassigned students in the school
    const unassignedStudents = await User.find({
      schoolId,
      role: 'student',
      status: 'active',
      $or: [
        { joinedGroups: { $exists: false } },
        { joinedGroups: { $size: 0 } },
      ],
    }).select('_id firstName lastName matricNumber email');

    if (unassignedStudents.length === 0) {
      return {
        success: true,
        message: 'No unassigned students found',
        processed: 0,
        assignments: [],
      };
    }

    const results = [];
    let totalAssignments = 0;

    // Process each student
    for (const student of unassignedStudents) {
      const result = await autoAssignStudentToGroups(student._id);
      if (result.success && result.assignments.length > 0) {
        results.push({
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`,
          matricNumber: student.matricNumber,
          assignmentCount: result.assignments.length,
          assignments: result.assignments,
        });
        totalAssignments += result.assignments.length;
      }
    }

    return {
      success: true,
      message: `Processed ${unassignedStudents.length} students, made ${totalAssignments} assignments`,
      processed: unassignedStudents.length,
      successfulAssignments: results.length,
      totalAssignments,
      results,
    };
  } catch (error) {
    console.error('Error in batch auto-assignment:', error);
    return { success: false, error: error.message };
  }
};

export const checkAndAutoAssign = async (req, res, next) => {
  try {
    // Only run for students
    if (req.user.role !== 'student') {
      return next();
    }

    // Get current status
    const status = await getStudentAssignmentStatus(req.user.id);

    // If student needs assignment, do it silently
    if (status.needsCheck) {
      // Run auto-assignment in background (don't await to avoid blocking)
      autoAssignStudentToGroups(req.user.id).catch((error) => {
        console.error('Background auto-assignment failed:', error);
      });
    }

    // Continue to next middleware/controller
    next();
  } catch (error) {
    // Don't block the request if auto-assignment fails
    console.error('Error in checkAndAutoAssign middleware:', error);
    next();
  }
};

/**
 * Manual trigger for checking new rosters (admin use)
 * @param {string} rosterId - Specific roster ID to check against all students
 * @returns {Object} - Assignment results for the roster
 */
export const checkRosterAgainstAllStudents = async (rosterId) => {
  try {
    const roster = await Roster.findById(rosterId)
      .populate('groupId', 'name courseCode status')
      .populate('uploadedBy', 'firstName lastName');

    if (!roster || roster.groupId.status !== 'active') {
      return { success: false, error: 'Invalid or inactive roster' };
    }

    const assignments = [];

    // Check each student in the roster
    for (const rosterStudent of roster.students) {
      if (rosterStudent.hasJoined) {
        continue; // Skip already joined students
      }

      // Try to find matching user
      let matchedUser = null;

      if (
        roster.matchStrategy.includes('matricNumber') &&
        rosterStudent.matricNumber
      ) {
        matchedUser = await User.findOne({
          matricNumber: rosterStudent.matricNumber,
          schoolId: roster.schoolId,
          role: 'student',
          status: 'active',
        });
      }

      if (
        !matchedUser &&
        roster.matchStrategy.includes('email') &&
        rosterStudent.email
      ) {
        matchedUser = await User.findOne({
          email: rosterStudent.email.toLowerCase(),
          schoolId: roster.schoolId,
          role: 'student',
          status: 'active',
        });
      }

      if (
        matchedUser &&
        !matchedUser.joinedGroups.includes(roster.groupId._id)
      ) {
        // Assign student to group
        const result = await autoAssignStudentToGroups(matchedUser._id);
        if (result.success && result.assignments.length > 0) {
          assignments.push({
            studentId: matchedUser._id,
            studentName: `${matchedUser.firstName} ${matchedUser.lastName}`,
            assignments: result.assignments,
          });
        }
      }
    }

    return {
      success: true,
      rosterName: roster.fileName,
      groupName: roster.groupId.name,
      courseCode: roster.groupId.courseCode,
      newAssignments: assignments.length,
      assignments,
    };
  } catch (error) {
    console.error('Error checking roster against students:', error);
    return { success: false, error: error.message };
  }
};
