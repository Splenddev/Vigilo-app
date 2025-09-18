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
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    filePublicId: { type: String, required: true }, // 🟢 add this for Cloudinary cleanup

    matchStrategy: {
      type: [String],
      enum: ['matricNumber', 'email'],
      default: ['matricNumber', 'email'],
    },

    session: {
      type: String,
      required: true,
      match: [/^\d{4}\/\d{4}$/, 'Session must be in format YYYY/YYYY'],
    },

    students: [
      {
        matricNumber: {
          type: String,
          required: true,
          match: [
            /^\d{2}\/[A-Z0-9]+\/\d+$/,
            'Matric number must follow format',
          ],
        },
        email: { type: String, lowercase: true, trim: true },
        firstName: { type: String, trim: true },
        lastName: { type: String, trim: true },
        isInvited: { type: Boolean, default: false },
        hasJoined: { type: Boolean, default: false },
      },
    ],

    stats: {
      totalStudents: { type: Number, default: 0 },
      registeredStudents: { type: Number, default: 0 },
      unregisteredStudents: { type: Number, default: 0 },
    },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

rosterSchema.index(
  { groupId: 1, 'students.matricNumber': 1 },
  { unique: true }
);

const Roster = mongoose.models.Roster || mongoose.model('Roster', rosterSchema);

export default Roster;
