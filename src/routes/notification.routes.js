import express from 'express';
import { protect } from '../middleware/protect.js';
import {
  fetchNotifications,
  deleteNotification,
  deleteAllNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationArchived,
  archiveAllNotifications,
} from '../controllers/notification.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', fetchNotifications);

router.delete('/:notificationId', deleteNotification);
router.delete('/', deleteAllNotifications);

router.patch('/:notificationId/read', markNotificationRead);
router.patch('/read-all', markAllNotificationsRead);

router.patch('/:notificationId/archive', markNotificationArchived);
router.patch('/archive-all', archiveAllNotifications);

export default router;
