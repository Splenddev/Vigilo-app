import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'absent',
    },

    // 🔹 Proof for primary + secondary methods
    proof: {
      primary: {
        device: String,
        ip: String,
        location: { lat: Number, lng: Number },
        verified: { type: Boolean, default: false },
      },
      secondary: {
        device: String,
        ip: String,
        location: { lat: Number, lng: Number },
        verified: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true }
);
// 🔹 Indexes
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

const AttendanceRecord =
  mongoose.models.AttendanceRecord ||
  mongoose.model('AttendanceRecord', attendanceRecordSchema);

export default AttendanceRecord;
