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
    password: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    level: { type: Number, min: 100, max: 600 },
    role: { type: String, enum: ['lecturer', 'student'], default: 'student' },
    expertise: { type: [String], default: [] },
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiry: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Prevent model overwrite in watch mode
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
