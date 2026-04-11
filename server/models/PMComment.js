const mongoose = require('mongoose');

const pmCommentSchema = new mongoose.Schema({
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('PMComment', pmCommentSchema);
