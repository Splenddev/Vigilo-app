export const sendNotification = (type, payload, groupId, io) => {
  io.to(groupId).emit('notification', {
    type,
    payload,
    createdAt: new Date(),
  });
};
