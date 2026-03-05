const { applyOperation } = require('./crdt');
const Room = require('../models/Room');
const { authFromToken } = require('./tokenAuth');

function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Unauthorized'));
      const user = await authFromToken(token);
      if (!user) return next(new Error('Unauthorized'));
      // eslint-disable-next-line no-param-reassign
      socket.user = { id: user.id, name: user.name };
      return next();
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-room', async ({ slug }) => {
      const room = await Room.findOne({ slug });
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      socket.join(slug);
      socket.emit('init-content', { content: room.currentContent });
      io.to(slug).emit('presence', { userId: socket.user.id, name: socket.user.name, type: 'join' });
    });

    socket.on('code-operation', async ({ slug, op, cursor }) => {
      const room = await Room.findOne({ slug });
      if (!room) return;
      room.currentContent = applyOperation(room.currentContent, op);
      room.operations.push({ userId: socket.user.id, op });
      await room.save();
      socket.to(slug).emit('code-operation', {
        userId: socket.user.id,
        op,
        cursor,
      });
    });

    socket.on('cursor-move', ({ slug, cursor }) => {
      socket.to(slug).emit('cursor-move', { userId: socket.user.id, cursor });
    });

    socket.on('chat-message', ({ slug, message }) => {
      io.to(slug).emit('chat-message', {
        userId: socket.user.id,
        name: socket.user.name,
        message,
        createdAt: new Date().toISOString(),
      });
    });

    socket.on('disconnecting', () => {
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
      rooms.forEach((slug) => {
        io.to(slug).emit('presence', {
          userId: socket.user.id,
          name: socket.user.name,
          type: 'leave',
        });
      });
    });
  });
}

module.exports = { initSocket };

