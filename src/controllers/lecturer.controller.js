import createHttpError from 'http-errors';
import GroupMember from '../models/GroupMember.js';

export const getAllStudentsForLecturer = async (req, res, next) => {
  try {
    const lecturerId = req.user?._id;
    if (!lecturerId) {
      throw createHttpError(401, 'Unauthorized: no user found in request');
    }

    const students = await GroupMember.aggregate([
      // Step 1: Get lecturer’s groups
      {
        $match: {
          userId: lecturerId,
          type: 'lecturer',
          status: 'active',
        },
      },
      {
        $group: {
          _id: null,
          groupIds: { $addToSet: '$groupId' },
        },
      },

      // Step 2: Lookup student members in those groups
      {
        $lookup: {
          from: 'groupmembers',
          let: { groupIds: '$groupIds' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$groupId', '$$groupIds'] },
                    { $eq: ['$type', 'student'] },
                    { $eq: ['$status', 'active'] },
                  ],
                },
              },
            },
            // Join user details
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: '$user' },

            // Join group details
            {
              $lookup: {
                from: 'groups',
                localField: 'groupId',
                foreignField: '_id',
                as: 'group',
              },
            },
            { $unwind: '$group' },

            // Only return what you need
            {
              $project: {
                _id: 0,
                'user._id': 1,
                'user.firstName': 1,
                'user.lastName': 1,
                'user.email': 1,
                'user.level': 1,
                'user.department': 1,
                'user.faculty': 1,
                'group._id': 1,
                'group.name': 1,
              },
            },
          ],
          as: 'students',
        },
      },

      // Step 3: Flatten & group students uniquely
      { $unwind: '$students' },
      {
        $group: {
          _id: '$students.user._id',
          user: { $first: '$students.user' },
          groups: { $addToSet: '$students.group' },
        },
      },
      {
        $project: {
          _id: 0,
          user: 1,
          groups: 1,
        },
      },
    ]);

    console.log(students);

    res.status(200).json({
      success: true,
      totalStudents: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
};
