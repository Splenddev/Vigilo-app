import createHttpError from 'http-errors';
import Notification from '../models/Notification.js';

export const fetchNotifications = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    let notifications;
    if (category) {
      notifications = await Notification.getByUserAndCategory(
        userId,
        category,
        page,
        limit
      );
    } else {
      notifications = await Notification.getUnreadForUser(userId, limit);
    }

    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, 'recipients.userId': userId },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!notification) throw createHttpError(404, 'Notification not found');

    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};

export const deleteAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { 'recipients.userId': userId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    res.json({ success: true, message: 'All notifications deleted' });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) throw createHttpError(404, 'Notification not found');

    await notification.markAsRead(userId);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { 'recipients.userId': userId, 'recipients.isRead': false },
      {
        $set: {
          'recipients.$.isRead': true,
          'recipients.$.readAt': new Date(),
        },
        $inc: { 'delivery.readCount': 1 },
      }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

export const markNotificationArchived = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(notificationId);
    if (!notification) throw createHttpError(404, 'Notification not found');

    await notification.markAsArchived(userId);

    res.json({ success: true, message: 'Notification archived' });
  } catch (err) {
    next(err);
  }
};

export const archiveAllNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { 'recipients.userId': userId, 'recipients.isArchived': false },
      {
        $set: {
          'recipients.$.isArchived': true,
          'recipients.$.archivedAt': new Date(),
        },
      }
    );

    res.json({ success: true, message: 'All notifications archived' });
  } catch (err) {
    next(err);
  }
};
