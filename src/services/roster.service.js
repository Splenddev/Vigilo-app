import Roster from '../models/Rooster.js';
import Group from '../models/Group.js';

export const matchStudentToRoster = async ({ user }) => {
  if (user.role !== 'student') return null;

  const { matricNumber, email, schoolId, _id } = user;

  // Find roster in this school
  const roster = await Roster.findOne({ schoolId });
  if (!roster) return null;

  // Determine fields to use for matching
  const strategy = roster.matchStrategy || ['matricNumber', 'email'];

  let matchQuery = null;

  if (strategy.includes('matricNumber')) {
    matchQuery = { 'students.matricNumber': matricNumber };
  }

  if (!matchQuery && strategy.includes('email')) {
    matchQuery = { 'students.email': email };
  }

  if (!matchQuery) return null;

  // Look for a student entry matching the chosen strategy
  const matchedRoster = await Roster.findOne({
    _id: roster._id,
    schoolId,
    ...matchQuery,
  });

  if (!matchedRoster) return null;

  // Update roster entry -> mark student as joined
  await Roster.updateOne(
    {
      _id: matchedRoster._id,
      ...matchQuery,
    },
    { $set: { 'students.$.hasJoined': true } }
  );

  // Attach student to group (if not already there)
  await Group.updateOne(
    { _id: matchedRoster.groupId },
    { $addToSet: { members: _id } } // assuming Group schema has `members: [ObjectId]`
  );

  return matchedRoster.groupId;
};
