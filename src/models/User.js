import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    matricNumber: {
      type: String,
      match: [
        /^\d{2}\/[A-Z0-9]+\/\d+$/,
        'Matric number must follow the format: YY/DEPTCODE/SEATNUMBER (e.g., 22/57BC/0000)',
      ],
      required: function () {
        return this.role === 'student';
      },
      trim: true,
    },
    password: { type: String, required: true, trim: true, select: false },
    department: {
      type: String,
      required: function () {
        return this.role !== 'admin' && this.role !== 'super_admin';
      },
      trim: true,
    },
    faculty: {
      type: String,
      required: function () {
        return this.role !== 'admin' && this.role !== 'super_admin';
      },
      trim: true,
    },
    level: {
      type: Number,
      min: 100,
      max: 600,
      required: function () {
        return this.role === 'student';
      },
    },
    role: {
      type: String,
      enum: ['lecturer', 'student', 'admin', 'super_admin'],
      default: 'student',
    },
    expertise: { type: [String], default: [] },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected'],
      default: 'pending',
    },
    joinedGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],

    createdGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: function () {
        return this.role !== 'admin' && this.role !== 'super_admin';
      },
      // default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
