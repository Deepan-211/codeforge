const express = require('express');
const { authRequired } = require('../middleware/auth');
const { generateSuggestions } = require('../services/aiService');
const Room = require('../models/Room');

const router = express.Router();

router.use(authRequired);

router.post('/suggest', async (req, res) => {
  const { slug, fileContent, prompt } = req.body;
  if (!slug || !fileContent) return res.status(400).json({ error: 'Missing fields' });

  const room = await Room.findOne({ slug });
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const historySummary = {
    codingStats: room.codingStats,
    roomName: room.name,
  };

  try {
    const suggestion = await generateSuggestions({
      fileContent,
      prompt,
      historySummary,
    });
    res.json({ suggestion });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('AI suggest error', err.message);
    res.status(502).json({ error: 'AI service unavailable' });
  }
});

module.exports = router;

