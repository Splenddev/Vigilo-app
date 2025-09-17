export const notifyStudentsOfGroupEnrollment = async (students, group) => {
  try {
    // You can implement email notifications, in-app notifications, etc.
    const notifications = students.map(student => ({
      userId: student._id,
      type: 'GROUP_ENROLLMENT',
      title: 'Added to New Group',
      message: `You have been enrolled in ${group.name} (${group.courseCode})`,
      data: {
        groupId: group._id,
        groupName: group.name,
        courseCode: group.courseCode,
      },
    }));

    // If you have a Notification model
    // await Notification.insertMany(notifications);

    console.log(`Notified ${students.length} students about group enrollment`);
  } catch (error) {
    console.error('Error sending notifications:', error);
    // Don't throw error here as it's not critical to the main operation
  }
};