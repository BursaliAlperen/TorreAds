const mongoose = require('mongoose');

const referralEarningSchema = new mongoose.Schema({
    referrerId: { type: String, required: true },
    newUserId: { type: String, required: true },
    level: { type: Number, required: true },
    percentage: { type: Number, required: true },
    amount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReferralEarning', referralEarningSchema);
