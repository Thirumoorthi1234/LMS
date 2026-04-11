const mongoose = require('mongoose');

const appraisalSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true, trim: true }, // e.g. "Q1 2025", "Annual 2025"
    ratings: {
        performance: { type: Number, min: 1, max: 5, default: 3 },
        communication: { type: Number, min: 1, max: 5, default: 3 },
        teamwork: { type: Number, min: 1, max: 5, default: 3 },
        leadership: { type: Number, min: 1, max: 5, default: 3 },
        innovation: { type: Number, min: 1, max: 5, default: 3 },
    },
    comments: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'submitted', 'acknowledged'], default: 'draft' },
}, { timestamps: true });

// Virtual: average rating
appraisalSchema.virtual('avgRating').get(function () {
    const r = this.ratings;
    const vals = [r.performance, r.communication, r.teamwork, r.leadership, r.innovation];
    return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
});

appraisalSchema.set('toJSON', { virtuals: true });
appraisalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appraisal', appraisalSchema);
