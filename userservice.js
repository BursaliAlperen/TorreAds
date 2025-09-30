const User = require('../models/User');

class UserService {
    async getOrCreateUser(userData) {
        let user = await User.findOne({ telegramId: userData.telegramId });
        
        if (!user) {
            const referralCode = await this.generateReferralCode(userData.telegramId);
            user = new User({
                ...userData,
                referralCode
            });
            await user.save();
        }
        
        return user;
    }

    async getUser(telegramId) {
        return await User.findOne({ telegramId });
    }

    async generateReferralCode(telegramId) {
        const baseCode = `TORRE${telegramId.slice(-6)}`;
        return baseCode;
    }

    async updateBalance(telegramId, amount) {
        const user = await User.findOne({ telegramId });
        if (user) {
            user.balance += amount;
            user.totalEarned += amount;
            await user.save();
            return user.balance;
        }
        return null;
    }
}

module.exports = UserService;
