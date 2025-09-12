import createHttpError from 'http-errors';
import Roster from '../models/Rooster.js';
import Group from '../models/Group.js';

export const createRoster = async (req, res, next) => {
  try {
    const { groupId, schoolId, students, fileName, fileUrl } = req.body;

    if (!groupId || !schoolId || !fileName || !fileUrl) {
      throw createHttpError(400, 'Missing required fields');
    }

    const group = await Group.findById(groupId);
    if (!group) throw createHttpError(404, 'Group not found');

    if (group.studentsRosterId) {
      throw createHttpError(400, 'Group already has a roster attached');
    }

    if (!Array.isArray(students) || students.length === 0) {
      throw createHttpError(
        400,
        'Roster data is required and must not be empty'
      );
    }

    if (String(group.createdBy) !== String(req.user._id)) {
      throw createHttpError(
        403,
        'You are not allowed to upload roster for this group'
      );
    }

    const roster = await Roster.create({
      groupId,
      schoolId,
      uploadedBy: req.user._id,
      fileName,
      fileUrl,
      students: students || [],
    });

    // Attach roster to group
    group.studentsRosterId = roster._id;
    await group.save();

    res.status(201).json({
      success: true,
      message: 'Roster created and attached to group',
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
