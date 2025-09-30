const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Kullanıcı oluşturma veya getirme
router.post('/user', async (req, res) => {
    try {
        const { telegramId, username, firstName, lastName } = req.body;
        
        let user = await User.findOne({ telegramId });
        
        if (!user) {
            // Referans kodu oluştur
            const referralCode = `TORRE${telegramId.slice(-6)}`;
            
            user = new User({
                telegramId,
                username,
                firstName,
                lastName,
                referralCode
            });
            await user.save();
        }
        
        res.json({
            success: true,
            user: {
                telegramId: user.telegramId,
                balance: user.balance,
                level: user.level,
                referralCode: user.referralCode,
                dailyAdsWatched: user.dailyAdsWatched,
                dailyAdLimit: user.dailyAdLimit
            }
        });
    } catch (error) {
        console.error('Kullanıcı oluşturma hatası:', error);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
});

module.exports = router;
