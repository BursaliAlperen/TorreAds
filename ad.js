const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    url: String,
    imageUrl: String,
    videoUrl: String,
    duration: { type: Number, default: 30 },
    reward: { type: Number, required: true },
    targetLevel: { type: String, default: 'bronze' },
    category: String,
    isActive: { type: Boolean, default: true },
    maxViews: Number,
    currentViews: { type: Number, default: 0 },
    advertiser: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ad', adSchema);
