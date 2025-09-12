import createHttpError from 'http-errors';
import Roster from '../models/Rooster.js';
import Group from '../models/Group.js';
import streamifier from 'streamifier';
import cloudinary from '../utils/cloudinary.js';

export const createRoster = async (req, res, next) => {
  try {
    const { groupId } = req.body;
    const students = JSON.parse(req.body.students || '[]');

    if (!groupId) {
      throw createHttpError(400, 'Group ID is required');
    }

    if (!req.file) {
      throw createHttpError(400, 'Roster file is required');
    }

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

    // Cloudinary upload stream
    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'rosters',
            resource_type: 'raw',
            public_id: `${groupId}-${Date.now()}`, // optional naming
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const uploadResult = await streamUpload();

    // Create roster entry
    const roster = await Roster.create({
      groupId,
      schoolId: req.user.schoolId, // from logged-in user
      uploadedBy: req.user._id,
      fileName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      students, // You can fill this if parsing CSV
    });

    // Attach to group
    group.studentsRosterId = roster._id;
    await group.save();

    res.status(201).json({
      success: true,
      message: 'Roster uploaded and attached to group',
      roster,
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
