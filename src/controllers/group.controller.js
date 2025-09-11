import createHttpError from 'http-errors';
import Group from '../models/Group.js';
import Roster from '../models/Roster.js';
import User from '../models/User.js';

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
      studentsRosterId: null, // initially no roster
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
        createHttpError(409, 'Group already exists for this lecturer')
      );
    }
    return next(createHttpError(500, 'Group creation failed'));
  }
};

export const uploadRoster = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { rosterData, schoolId } = req.body;

    if (!Array.isArray(rosterData) || rosterData.length === 0) {
      throw createHttpError(
        400,
        'Roster data is required and must not be empty'
      );
    }

    const group = await Group.findById(groupId);
    if (!group) throw createHttpError(404, 'Group not found');

    if (String(group.createdBy) !== String(req.user._id)) {
      throw createHttpError(
        403,
        'You are not allowed to upload roster for this group'
      );
    }

    const roster = await Roster.create({
      schoolId,
      createdBy: req.user._id,
      students: rosterData,
    });

    group.studentsRosterId = roster._id;
    await group.save();

    res
      .status(201)
      .json({ success: true, message: 'Roster uploaded successfully', roster });
  } catch (error) {
    next(error);
  }
};
