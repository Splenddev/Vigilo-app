import mongoose from 'mongoose';

const attendanceSessionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // lecturer
      required: true,
    },

    type: {
      type: String,
      enum: ['lecture', 'lab', 'tutorial', 'exam', 'other'],
      default: 'lecture',
    },

    date: {
      type: Date,
      default: Date.now,
    },

    methods: {
      primary: {
        type: String,
        enum: ['manual', 'qr', 'code', 'gps', 'face'],
        required: true,
      },
      secondary: {
        type: String,
        enum: ['manual', 'qr', 'code', 'gps', 'face', null],
        default: null,
      },
    },

    meta: {
      location: { lat: Number, lng: Number },
      device: String,
      notes: String,
    },

    stats: {
      totalStudents: { type: Number, default: 0 },
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

const AttendanceSession =
  mongoose.models.AttendanceSession ||
  mongoose.model('AttendanceSession', attendanceSessionSchema);

export default AttendanceSession;
