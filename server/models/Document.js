const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    type: {
        type: String,
        enum: ['appointment_letter', 'experience_letter', 'salary_revision', 'offer_letter', 'payslip', 'id_proof', 'certificate', 'bgv', 'other'],
        default: 'other'
    },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileData: { type: String, default: '' },      // base64 or URL
    fileName: { type: String, default: '' },
    fileType: { type: String, default: '' },       // mime type
    version: { type: Number, default: 1 },
    content: { type: String, default: '' },        // template content / generated text
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
