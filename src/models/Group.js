import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    level: {
      type: Number,
      required: true,
      min: 100,
      max: 600,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    faculty: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentsRosterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roster',
      default: null,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Unique per lecturer within a school
groupSchema.index(
  { schoolId: 1, courseCode: 1, level: 1, department: 1, createdBy: 1 },
  { unique: true }
);

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema);

export default Group;
