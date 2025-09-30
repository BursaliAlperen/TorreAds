const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    username: String,
    firstName: String,
    lastName: String,
    balance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    level: { type: String, default: 'bronze' },
    referralCode: { type: String, unique: true },
    referredBy: { type: String, default: null },
    referralCount: { type: Number, default: 0 },
    dailyAdsWatched: { type: Number, default: 0 },
    lastAdWatch: Date,
    walletAddress: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now }
});

// Sanal alanlar
userSchema.virtual('dailyAdLimit').get(function() {
    const limits = { bronze: 10, silver: 25, gold: 50, platinum: 100 };
    return limits[this.level] || 10;
});

userSchema.virtual('earnMultiplier').get(function() {
    const multipliers = { bronze: 1.0, silver: 1.1, gold: 1.25, platinum: 1.5 };
    return multipliers[this.level] || 1.0;
});

// Günlük limit sıfırlama
userSchema.methods.resetDailyLimit = function() {
    const now = new Date();
    const lastReset = new Date(this.lastAdWatch);
    
    if (lastReset.getDate() !== now.getDate() || 
        lastReset.getMonth() !== now.getMonth() || 
        lastReset.getFullYear() !== now.getFullYear()) {
        this.dailyAdsWatched = 0;
    }
};

module.exports = mongoose.model('User', userSchema);
