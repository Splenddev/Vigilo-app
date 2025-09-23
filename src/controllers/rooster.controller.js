import createHttpError from 'http-errors';
import Roster from '../models/Rooster.js';
import Group from '../models/Group.js';
import streamifier from 'streamifier';
import cloudinary from '../utils/cloudinary.js';
import { parseCSVBuffer, processStudentData } from '../utils/roster.utils.js';
import {
  notifyStudentsOfGroupEnrollment,
  sendNotification,
} from '../utils/notifications.js';
import GroupMember from '../models/GroupMember.js';

export const createRoster = async (req, res, next) => {
  try {
    const { groupId, session } = req.body;
    let students = JSON.parse(req.body.students || '[]');

    if (!groupId) throw createHttpError(400, 'Group ID is required');
    if (!req.file) throw createHttpError(400, 'Roster file is required');

    // Validate group
    const group = await Group.findById(groupId);
    if (!group) throw createHttpError(404, 'Group not found');

    if (group.studentsRosterId) {
      throw createHttpError(400, 'Group already has a roster attached');
    }

    if (String(group.createdBy) !== String(req.user._id)) {
      throw createHttpError(
        403,
        'You are not allowed to upload roster for this group'
      );
    }

    // Parse CSV if no students passed explicitly
    if (students.length === 0 && req.file.mimetype === 'text/csv') {
      students = await parseCSVBuffer(req.file.buffer);
    }

    if (!Array.isArray(students) || students.length === 0) {
      throw createHttpError(400, 'No valid student data found in roster');
    }

    // Separate matched vs unmatched students
    const { matchedStudents, unmatchedStudents, rosterStudents } =
      await processStudentData(students, req.user.schoolId);

    // Upload file to cloudinary
    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'rosters',
            resource_type: 'raw',
            public_id: `${groupId}-${new Date().toISOString()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const uploadResult = await streamUpload();

    // Create roster record
    const roster = await Roster.create({
      groupId,
      schoolId: req.user.schoolId,
      uploadedBy: req.user._id,
      fileName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      filePublicId: uploadResult.public_id,
      students: rosterStudents,
      session,
      stats: {
        totalStudents: rosterStudents.length,
        registeredStudents: matchedStudents.length,
        unregisteredStudents: unmatchedStudents.length,
      },
    });

    // Create membership docs for matched students
    let newMembersCount = 0;
    for (const student of matchedStudents) {
      const existing = await GroupMember.findOne({
        groupId: group._id,
        userId: student._id,
      });

      if (!existing) {
        await GroupMember.create({
          groupId: group._id,
          schoolId: req.user.schoolId,
          userId: student._id,
          role: 'member',
          joinMethod: 'roster',
          status: 'active',
          joinedAt: new Date(),
        });

        newMembersCount++;
      }
    }

    // Update group roster reference + memberCount
    group.studentsRosterId = roster._id;
    if (newMembersCount > 0) {
      group.memberCount += newMembersCount;
    }
    await group.save();

    // 🔔 Notify students
    if (matchedStudents.length > 0) {
      await notifyStudentsOfGroupEnrollment(
        matchedStudents,
        group,
        req.user._id
      );
    }

    // 🔔 Notify uploader
    await sendNotification({
      sender: req.user._id,
      recipients: [{ userId: req.user._id, role: 'lecturer' }],
      groupId: group._id,
      type: 'roster_uploaded',
      title: 'Roster Uploaded Successfully',
      message: `Your roster for ${group.name} (${group.courseCode}) has been processed. ${matchedStudents.length} students matched and ${unmatchedStudents.length} unmatched.`,
      metadata: {
        actionType: 'navigate',
        actionData: {
          route: `/groups/${group._id}/roster/${roster._id}`,
          entityId: roster._id,
          entityType: 'Roster',
        },
        priority: 'normal',
        icon: 'file-text',
        color: 'purple',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Roster uploaded and students processed successfully',
      data: {
        roster,
        stats: {
          totalStudents: rosterStudents.length,
          studentsAddedToGroup: newMembersCount,
          studentsWithAccounts: matchedStudents.length,
          studentsWithoutAccounts: unmatchedStudents.length,
        },
        matchedStudents: matchedStudents.map((s) => ({
          id: s._id,
          name: `${s.firstName} ${s.lastName}`,
          email: s.email,
          studentId: s.studentId,
        })),
        unmatchedStudents: unmatchedStudents.map((s) => ({
          name: s.name,
          email: s.email,
          studentId: s.studentId,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getRoster = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).populate('studentsRosterId');
    if (!group) throw createHttpError(404, 'Group not found');

    if (!group.studentsRosterId) {
      throw createHttpError(404, 'No roster attached to this group');
    }

    res.json({
      success: true,
      roster: group.studentsRosterId,
    });
  } catch (err) {
    next(err);
  }
};

export const updateRoster = async (req, res, next) => {
  try {
    const { rosterId } = req.params;
    const { fileName, fileUrl, students } = req.body;

    const roster = await Roster.findById(rosterId);
    if (!roster) throw createHttpError(404, 'Roster not found');

    if (fileName) roster.fileName = fileName;
    if (fileUrl) roster.fileUrl = fileUrl;
    if (students) roster.students = students;

    await roster.save();

    res.json({
      success: true,
      message: 'Roster updated successfully',
      roster,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRoster = async (req, res, next) => {
  try {
    const { rosterId } = req.params;

    const roster = await Roster.findById(rosterId);
    if (!roster) throw createHttpError(404, 'Roster not found');

    // Reset the group’s roster reference
    await Group.findByIdAndUpdate(roster.groupId, {
      $set: { studentsRosterId: null },
    });

    await roster.deleteOne();

    res.json({
      success: true,
      message: 'Roster deleted and group reset',
    });
  } catch (err) {
    next(err);
  }
};

export const attachRosterToGroup = async (req, res, next) => {
  try {
    const { groupId, rosterId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) throw createHttpError(404, 'Group not found');

    const roster = await Roster.findById(rosterId);
    if (!roster) throw createHttpError(404, 'Roster not found');

    // Ensure roster belongs to the same group/school context
    if (roster.schoolId.toString() !== group.schoolId.toString()) {
      throw createHttpError(
        400,
        'Roster and group must belong to the same school'
      );
    }

    group.studentsRosterId = roster._id;
    await group.save();

    res.json({
      success: true,
      message: 'Roster attached to group successfully',
      group,
    });
  } catch (err) {
    next(err);
  }
};
