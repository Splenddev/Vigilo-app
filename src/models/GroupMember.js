import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 🔹 Explicitly separate STUDENTS vs LECTURERS
    type: {
      type: String,
      enum: ['student', 'lecturer'],
      required: true,
    },

    // 🔹 Role is contextual within type
    role: {
      type: String,
      enum: [
        // student roles
        'member',
        'class-rep',
        'assistant-rep',

        // lecturer roles
        'creator',
        'co-lecturer',
      ],
      default: 'member',
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    removedAt: { type: Date },

    joinMethod: {
      type: String,
      enum: ['roster', 'self-join', 'manual-add'],
      default: 'roster',
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    permissions: {
      canInvite: { type: Boolean, default: false },
      canRemove: { type: Boolean, default: false },
      canEdit: { type: Boolean, default: false },
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    lastAttendance: { type: Date },
  },
  { timestamps: true }
);

// 🔹 Indexes
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMemberSchema.index({ groupId: 1, status: 1 });
groupMemberSchema.index({ userId: 1, status: 1 });
groupMemberSchema.index({ groupId: 1, role: 1 });
groupMemberSchema.index({ groupId: 1, type: 1 });
groupMemberSchema.index({ schoolId: 1, userId: 1 });

groupMemberSchema.methods.hasPermission = function (permission) {
  if (this.role === 'creator') return true;
  return this.permissions?.[permission] || false;
};

const GroupMember =
  mongoose.models.GroupMember ||
  mongoose.model('GroupMember', groupMemberSchema);

export default GroupMember;
