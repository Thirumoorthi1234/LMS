const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['laptop', 'mobile', 'monitor', 'keyboard', 'mouse', 'headset', 'tablet', 'other'], default: 'other' },
    serialNumber: { type: String, trim: true, default: '' },
    brand: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    purchaseDate: { type: Date },
    purchaseValue: { type: Number, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedDate: { type: Date },
    returnedDate: { type: Date },
    status: { type: String, enum: ['available', 'assigned', 'returned', 'damaged', 'retired'], default: 'available' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
