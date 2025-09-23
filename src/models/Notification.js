import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    // Core identification
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: function () {
        return !['system', 'admin'].includes(this.category);
      },
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Recipient system
    recipients: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['student', 'lecturer', 'admin', 'super_admin'],
          required: true,
        },
        isRead: { type: Boolean, default: false },
        readAt: Date,
        isArchived: { type: Boolean, default: false },
        archivedAt: Date,
      },
    ],

    // Categorization
    category: {
      type: String,
      enum: ['academic', 'administrative', 'system', 'social', 'emergency'],
      default: 'academic',
    },

    type: {
      type: String,
      enum: [
        // Academic
        'assignment_created',
        'assignment_due',
        'assignment_graded',
        'attendance_marked',
        'attendance_reminder',
        'exam_scheduled',
        'grade_published',
        'course_update',
        'lecture_cancelled',
        'lecture_rescheduled',
        // Administrative
        'enrollment_approved',
        'enrollment_rejected',
        'payment_due',
        'payment_received',
        'document_required',
        'document_approved',
        // System
        'system_maintenance',
        'feature_update',
        'security_alert',
        // Social
        'group_invitation',
        'message_received',
        'mention',
        // Emergency
        'urgent_announcement',
        'emergency_alert',
        //Feature
        'group_created','roster_uploaded'
      ],
      required: true,
    },

    // Content
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Rich content support
    metadata: {
      actionType: {
        type: String,
        enum: [
          'navigate',
          'download',
          'approve',
          'reject',
          'mark_attendance',
          'submit_assignment',
          'view_grade',
          'join_meeting',
          'open_document',
          'none',
        ],
        default: 'none',
      },
      actionData: {
        route: String,
        entityId: mongoose.Schema.Types.ObjectId,
        entityType: String,
        url: String,
        fileUrl: String,
        meetingLink: String,
        params: mongoose.Schema.Types.Mixed,
      },
      priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
      },
      icon: { type: String, default: 'bell' },
      color: {
        type: String,
        enum: ['blue', 'green', 'yellow', 'red', 'purple', 'gray'],
        default: 'blue',
      },
      expiresAt: Date,
      groupKey: String,
      attachments: [
        {
          type: String,
          url: String,
          size: Number,
          mimeType: String,
        },
      ],
    },

    // Delivery info
    delivery: {
      sentAt: { type: Date, default: Date.now },
      deliveryMethod: {
        type: [String],
        enum: ['in_app', 'email', 'sms', 'push'],
        default: ['in_app'],
      },
      deliveryStatus: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed'],
        default: 'pending',
      },
      totalRecipients: {
        type: Number,
        default: function () {
          return this.recipients.length;
        },
      },
      readCount: { type: Number, default: 0 },
    },

    // System-level delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,

    // Global flag
    isGlobal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* --------------------- Indexes --------------------- */
notificationSchema.index({ 'recipients.userId': 1, 'recipients.isRead': 1 });
notificationSchema.index({ type: 1, category: 1 });
notificationSchema.index({ groupId: 1, createdAt: -1 });
notificationSchema.index({ 'metadata.expiresAt': 1 });
notificationSchema.index({ 'delivery.sentAt': -1 });

/* --------------------- Virtuals --------------------- */
notificationSchema.virtual('unreadCount').get(function () {
  return this.recipients.filter((r) => !r.isRead).length;
});

/* --------------------- Instance Methods --------------------- */
notificationSchema.methods.markAsRead = function (userId) {
  const recipient = this.recipients.find(
    (r) => r.userId.toString() === userId.toString()
  );
  if (recipient && !recipient.isRead) {
    recipient.isRead = true;
    recipient.readAt = new Date();
    this.delivery.readCount += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

notificationSchema.methods.markAsArchived = function (userId) {
  const recipient = this.recipients.find(
    (r) => r.userId.toString() === userId.toString()
  );
  if (recipient && !recipient.isArchived) {
    recipient.isArchived = true;
    recipient.archivedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

notificationSchema.methods.isReadByUser = function (userId) {
  const recipient = this.recipients.find(
    (r) => r.userId.toString() === userId.toString()
  );
  return recipient ? recipient.isRead : false;
};

notificationSchema.methods.isArchivedByUser = function (userId) {
  const recipient = this.recipients.find(
    (r) => r.userId.toString() === userId.toString()
  );
  return recipient ? recipient.isArchived : false;
};

/* --------------------- Static Methods --------------------- */
// Bulk mark as read
notificationSchema.statics.markManyAsRead = function (userId, notificationIds) {
  return this.updateMany(
    { _id: { $in: notificationIds }, 'recipients.userId': userId },
    {
      $set: { 'recipients.$.isRead': true, 'recipients.$.readAt': new Date() },
      $inc: { 'delivery.readCount': 1 },
    }
  );
};

// Bulk mark as archived
notificationSchema.statics.markManyAsArchived = function (
  userId,
  notificationIds
) {
  return this.updateMany(
    { _id: { $in: notificationIds }, 'recipients.userId': userId },
    {
      $set: {
        'recipients.$.isArchived': true,
        'recipients.$.archivedAt': new Date(),
      },
    }
  );
};

notificationSchema.statics.getUnreadForUser = function (userId, limit = 10) {
  return this.find({
    'recipients.userId': userId,
    'recipients.isRead': false,
    'recipients.isArchived': false,
    isDeleted: false,
    $or: [
      { 'metadata.expiresAt': { $exists: false } },
      { 'metadata.expiresAt': { $gt: new Date() } },
    ],
  })
    .populate('sender', 'name email profilePicture')
    .populate('groupId', 'name code')
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.getByUserAndCategory = function (
  userId,
  category,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;
  return this.find({
    'recipients.userId': userId,
    'recipients.isArchived': false,
    category,
    isDeleted: false,
    $or: [
      { 'metadata.expiresAt': { $exists: false } },
      { 'metadata.expiresAt': { $gt: new Date() } },
    ],
  })
    .populate('sender', 'name email profilePicture')
    .populate('groupId', 'name courseCode')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

notificationSchema.statics.getNotificationStats = function (userId) {
  return this.aggregate([
    {
      $match: {
        'recipients.userId': new mongoose.Types.ObjectId(userId),
        isDeleted: false,
      },
    },
    { $unwind: '$recipients' },
    {
      $match: {
        'recipients.userId': new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        unread: {
          $sum: { $cond: [{ $eq: ['$recipients.isRead', false] }, 1, 0] },
        },
      },
    },
  ]);
};

notificationSchema.pre('find', function () {
  this.where({
    $or: [
      { 'metadata.expiresAt': { $exists: false } },
      { 'metadata.expiresAt': { $gt: new Date() } },
    ],
  });
});

const Notification =
  mongoose.models.Notification ||
  mongoose.model('Notification', notificationSchema);

export default Notification;
