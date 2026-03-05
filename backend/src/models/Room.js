const mongoose = require('mongoose');

const OperationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    op: { type: Object, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SnapshotSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const RoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
      },
    ],
    currentContent: { type: String, default: '' },
    operations: [OperationSchema],
    snapshots: [SnapshotSchema],
    codingStats: {
      languages: { type: Map, of: Number, default: {} },
      patterns: { type: Map, of: Number, default: {} },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', RoomSchema);

