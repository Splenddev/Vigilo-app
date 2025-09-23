import Notification from '../models/Notification.js';

export const notifyStudentsOfGroupEnrollment = async (
  students,
  group,
  senderId
) => {
  try {
    const notifications = students.map((student) => ({
      groupId: group._id,
      sender: senderId || group.createdBy,
      recipients: [
        {
          userId: student._id,
          role: 'student',
        },
      ],
      category: 'academic',
      type: 'enrollment_approved',
      title: 'Added to New Group',
      message: `You have been enrolled in ${group.name} (${group.courseCode})`,
      metadata: {
        actionType: 'navigate',
        actionData: {
          route: `/groups/${group._id}/info`,
          entityId: group._id,
          entityType: 'Group',
        },
        priority: 'normal',
        icon: 'users',
        color: 'blue',
      },
      delivery: {
        deliveryMethod: ['in_app'],
        deliveryStatus: 'pending',
        sentAt: new Date(),
        totalRecipients: 1,
      },
    }));

    await Notification.insertMany(notifications);

    console.log(
      `✅ Notified ${students.length} students about group enrollment`
    );
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
    throw error;
  }
};

export const sendNotification = async ({
  sender,
  recipients,
  type,
  title,
  message,
  groupId = null,
  category = 'academic',
  metadata = {},
  deliveryMethod = ['in_app'],
}) => {
  try {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('Recipients are required');
    }

    const notification = new Notification({
      sender,
      groupId,
      recipients: recipients.map((r) => ({
        userId: r.userId,
        role: r.role || 'student',
      })),
      category,
      type,
      title,
      message,
      metadata,
      delivery: {
        deliveryMethod,
        deliveryStatus: 'pending',
        totalRecipients: recipients.length,
      },
    });

    await notification.save();

    return notification;
  } catch (error) {
    console.error('sendNotification error:', error);
    throw error;
  }
};

export const sendBulkNotifications = async (notifications = []) => {
  if (!notifications.length) return [];
  try {
    const docs = notifications.map((n) => ({
      sender: n.sender,
      groupId: n.groupId || null,
      recipients: n.recipients.map((r) => ({
        userId: r.userId,
        role: r.role || 'student',
      })),
      category: n.category || 'academic',
      type: n.type,
      title: n.title,
      message: n.message,
      metadata: n.metadata || {},
      delivery: {
        deliveryMethod: n.deliveryMethod || ['in_app'],
        deliveryStatus: 'pending',
        totalRecipients: n.recipients.length,
      },
    }));

    return await Notification.insertMany(docs);
  } catch (error) {
    console.error('sendBulkNotifications error:', error);
    throw error;
  }
};

export const notifyAutoAssignment = async ({ student, assignments }) => {
  if (!assignments.length) return null;

  return sendNotification({
    sender: student._id,
    recipients: [{ userId: student._id, role: 'student' }],
    groupId: null,
    type: 'group_invitation',
    category: 'academic',
    title: 'You’ve been added to new group(s)',
    message: `You were automatically assigned to ${
      assignments.length
    } group(s): ${assignments.map((a) => a.groupName).join(', ')}.`,
    metadata: {
      actionType: 'navigate',
      actionData: {
        route: '/groups',
      },
      priority: 'normal',
      icon: 'users',
      color: 'green',
    },
  });
};
