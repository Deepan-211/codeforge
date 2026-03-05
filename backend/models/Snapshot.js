const mongoose = require('mongoose');

const SnapshotSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Snapshot', SnapshotSchema);
