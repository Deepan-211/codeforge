const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const KMeans = require('ml-kmeans');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Rate limiting for AI endpoint
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10, // 10 calls per IP
  message: 'Too many AI requests, slow down!'
});
app.use('/ai/complete', aiLimiter);

const SECRET = process.env.JWT_SECRET || 'hackathon-secret';

// Middleware: Authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Auth: Simple login (username only for hack)
app.post('/auth/login', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });
  const token = jwt.sign({ username }, SECRET, { expiresIn: '24h' });
  res.json({ token, username });
});

// Rooms: Create/join (POST for create)
app.post('/rooms', authenticateToken, (req, res) => {
  const { roomId } = req.body;
  if (!roomId) return res.status(400).json({ error: 'Room ID required' });
  res.json({ roomId, message: 'Room ready' });
});

// AI Completion: Hugging Face + Personalization
app.post('/ai/complete', authenticateToken, async (req, res) => {
  const { prompt, context, patterns } = req.body; // patterns: {react: 5, node: 2}
  
  // Simple personalization: Bias prompt based on clustered patterns
  let biasedPrompt = prompt;
  if (patterns) {
    const vectors = [Object.values(patterns)]; // Mock: single vector for team
    if (vectors[0].some(v => v > 3)) { // If high usage
      biasedPrompt = `In a ${Object.keys(patterns).find(k => patterns[k] > 3)}-heavy project: ${prompt}`;
    }
  }

  try {
    const hfRes = await axios.post(
      'https://api-inference.huggingface.co/models/Salesforce/codegen-350M-mono',
      { inputs: `${context}\n// ${biasedPrompt}:` },
      { headers: { Authorization: `Bearer ${process.env.HF_TOKEN}` } }
    );
    const suggestion = hfRes.data[0]?.generated_text?.split('//')[1] || '// AI suggestion here';
    res.json({ suggestion });
  } catch (err) {
    console.error(err);
    res.json({ suggestion: '// Fallback: e.g., useEffect(() => {}, []) for React hooks' });
  }
});

// Demo endpoint for judging
app.get('/demo', (req, res) => {
  res.json({ roomId: 'hackathon-demo', seedCode: '// Welcome to CodeForge AI!' });
});

// Sockets: Real-time collab
let userRooms = {}; // Track users in rooms
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', (roomId, userId, username) => {
    userRooms[socket.id] = { roomId, username };
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', { userId, username });
    io.to(roomId).emit('users-list', Object.values(userRooms).filter(u => u.roomId === roomId));
  });

  // Code change broadcast
  socket.on('code-change', (data) => { // { roomId, code, cursorPos }
    socket.to(data.roomId).emit('code-update', data);
  });

  // Cursor move
  socket.on('cursor-move', (data) => { // { roomId, cursorPos, username }
    socket.to(data.roomId).emit('cursor-update', data);
  });

  // Pattern update (team aggregates)
  socket.on('pattern-update', (data) => { // { roomId, patterns }
    // Mock clustering: Aggregate and "retrain" (simple avg for demo)
    socket.to(data.roomId).emit('patterns-clustered', data.patterns);
  });

  socket.on('disconnect', () => {
    const room = userRooms[socket.id];
    if (room) socket.to(room.roomId).emit('user-left', { username: room.username });
    delete userRooms[socket.id];
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log(`CodeForge Backend on port ${process.env.PORT || 5000}`);
});