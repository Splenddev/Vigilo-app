import createHttpError from 'http-errors';
import Group from '../models/Group.js';
import Roster from '../models/Rooster.js';
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
