require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const { initSocket } = require('./src/realtime/socket');
const { connectDb } = require('./src/config/db');

const authRoutes = require('./src/routes/auth');
const roomRoutes = require('./src/routes/rooms');
const aiRoutes = require('./src/routes/ai');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDb();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  });
  app.use(limiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/ai', aiRoutes);

  initSocket(io);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend', err);
  process.exit(1);
});

