const express = require('express');
const Room = require('../models/Room');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

router.use(authRequired);

router.get('/', async (req, res) => {
  const rooms = await Room.find({ 'members.user': req.user.id }).select('name slug createdAt');
  res.json(rooms);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
  const room = await Room.create({
    name,
    slug,
    createdBy: req.user.id,
    members: [{ user: req.user.id, role: 'admin' }],
  });
  res.status(201).json(room);
});

router.get('/:slug', async (req, res) => {
  const room = await Room.findOne({ slug: req.params.slug }).populate('members.user', 'name email');
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const isMember = room.members.some((m) => String(m.user._id) === String(req.user.id));
  if (!isMember) return res.status(403).json({ error: 'Forbidden' });
  res.json(room);
});

router.post('/:slug/snapshots', async (req, res) => {
  const { content } = req.body;
  const room = await Room.findOne({ slug: req.params.slug });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const isAdmin = room.members.some(
    (m) => String(m.user) === String(req.user.id) && m.role === 'admin'
  );
  if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });
  room.snapshots.push({ content });
  room.currentContent = content;
  await room.save();
  res.status(201).json(room.snapshots[room.snapshots.length - 1]);
});

router.get('/:slug/snapshots', async (req, res) => {
  const room = await Room.findOne({ slug: req.params.slug }).select('snapshots');
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.snapshots);
});

module.exports = router;

