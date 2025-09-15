import Roster from '../models/Rooster.js';
import Group from '../models/Group.js';

export const matchStudentToRoster = async ({ user }) => {
  if (user.role !== 'student') return null;

  const { matricNumber, email, schoolId, _id } = user;

  // Get all rosters in this school
  const rosters = await Roster.find({ schoolId });
  if (!rosters.length) return null;

  const matchedGroupIds = [];

  for (const roster of rosters) {
    const strategy = roster.matchStrategy || ['matricNumber', 'email'];

    // Build arrayFilters conditions
    const arrayConditions = [];
    if (strategy.includes('matricNumber') && matricNumber) {
      arrayConditions.push({ 'elem.matricNumber': matricNumber });
    }
    if (strategy.includes('email') && email) {
      arrayConditions.push({ 'elem.email': email });
    }

    if (!arrayConditions.length) continue;

    // Try to update the student entry in this roster
    const updateResult = await Roster.updateOne(
      { _id: roster._id },
      { $set: { 'students.$[elem].hasJoined': true } },
      { arrayFilters: [{ $or: arrayConditions }] }
    );

    if (updateResult.modifiedCount > 0) {
      // If student was marked as joined, add to the group
      await Group.updateOne(
        { _id: roster.groupId },
        { $addToSet: { members: _id } }
      );
      matchedGroupIds.push(roster.groupId);
    }
  }

  return matchedGroupIds.length ? matchedGroupIds : null;
};
