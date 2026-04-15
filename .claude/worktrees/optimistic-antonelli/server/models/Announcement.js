const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['announcement', 'event', 'birthday', 'anniversary', 'policy', 'alert'], default: 'announcement' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    audience: { type: String, enum: ['all', 'hr', 'employee', 'admin'], default: 'all' },
    pinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
