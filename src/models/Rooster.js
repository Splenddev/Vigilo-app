import mongoose from 'mongoose';

const rosterSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    students: [
      {
        matricNumber: {
          type: String,
          required: true,
          match: [
            /^\d{2}\/[A-Z0-9]+\/\d+$/,
            'Matric number must follow format: YY/DEPTCODE/SEATNUMBER',
          ],
        },
        email: { type: String, lowercase: true, trim: true },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        isInvited: { type: Boolean, default: false },
        hasJoined: { type: Boolean, default: false },
      },
    ],
  },
  {
    timestamps: true,
  }
);

rosterSchema.index(
  { groupId: 1, 'students.matricNumber': 1 },
  { unique: true }
);

const Roster = mongoose.models.Roster || mongoose.model('Roster', rosterSchema);

export default Roster;
