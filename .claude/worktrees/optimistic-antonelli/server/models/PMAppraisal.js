const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    technical: { type: Number, min: 1, max: 4, default: null },
    communication: { type: Number, min: 1, max: 4, default: null },
    productivity: { type: Number, min: 1, max: 4, default: null },
    teamwork: { type: Number, min: 1, max: 4, default: null }
}, { _id: false });

const managerRatingSchema = new mongoose.Schema({
    workQuality: { type: Number, min: 1, max: 4, default: null },
    productivity: { type: Number, min: 1, max: 4, default: null },
    technicalSkills: { type: Number, min: 1, max: 4, default: null },
    teamCollaboration: { type: Number, min: 1, max: 4, default: null },
    problemSolving: { type: Number, min: 1, max: 4, default: null }
}, { _id: false });

const pmAppraisalSchema = new mongoose.Schema({
    appraisalId: { type: String, unique: true, sparse: true },

    // Employee info
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    projectName: { type: String, default: '' },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    appraisalPeriod: { type: String, default: '' },  // e.g. "Q1 2024"

    // Self-appraisal (filled by employee)
    selfAppraisal: {
        keyAchievements: { type: String, default: '' },
        completedTasks: { type: String, default: '' },
        technicalImprovement: { type: String, default: '' },
        teamCollaboration: { type: String, default: '' },
        problemSolving: { type: String, default: '' },
        trainingsCompleted: { type: String, default: '' },
        selfRating: { type: ratingSchema, default: {} },
        submittedAt: { type: Date }
    },

    // Manager review (filled by PM)
    managerReview: {
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        criteriaRatings: { type: managerRatingSchema, default: {} },
        categoryLevel: { type: Number, min: 1, max: 4, default: null },
        // Level 1=Outstanding, 2=Exceeds Expectations, 3=Meets Expectations, 4=Needs Improvement
        strengths: { type: String, default: '' },
        areasForImprovement: { type: String, default: '' },
        trainingRecommendations: { type: String, default: '' },
        promotionRecommended: { type: Boolean, default: false },
        managerComments: { type: String, default: '' },
        reviewedAt: { type: Date }
    },

    // HR final review
    hrReview: {
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        finalCategoryLevel: { type: Number, min: 1, max: 4, default: null },
        hrRemarks: { type: String, default: '' },
        approvedAt: { type: Date }
    },

    // Workflow
    status: {
        type: String,
        enum: ['draft', 'submitted', 'under-review', 'hr-review', 'approved', 'rejected'],
        default: 'draft'
    },

    // Audit log
    auditLog: [{
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        note: String
    }]
}, { timestamps: true });

pmAppraisalSchema.pre('save', async function (next) {
    if (!this.appraisalId) {
        const count = await mongoose.model('PMAppraisal').countDocuments();
        this.appraisalId = `APR-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Virtual: overall manager average rating
pmAppraisalSchema.virtual('managerAvgRating').get(function () {
    const r = this.managerReview?.criteriaRatings;
    if (!r) return null;
    const vals = [r.workQuality, r.productivity, r.technicalSkills, r.teamCollaboration, r.problemSolving].filter(Boolean);
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : null;
});

module.exports = mongoose.model('PMAppraisal', pmAppraisalSchema);
