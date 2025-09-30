const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ReferralEarning = require('../models/ReferralEarning');

// Referans istatistikleri
router.get('/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        
        const totalReferrals = await User.countDocuments({ referredBy: userId });
        const activeReferrals = await User.countDocuments({ 
            referredBy: userId, 
            isActive: true 
        });
        
        const totalCommission = await ReferralEarning.aggregate([
            { $match: { referrerId: userId } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const user = await User.findOne({ telegramId: userId });

        res.json({
            totalReferrals,
            activeReferrals,
            totalCommission: totalCommission[0]?.total || 0,
            referralCode: user?.referralCode
        });
    } catch (error) {
        console.error('Referans istatistikleri hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Referans işleme
router.post('/handle', async (req, res) => {
    try {
        const { newUserId, referrerCode } = req.body;

        const referrer = await User.findOne({ referralCode: referrerCode });
        if (!referrer || referrer.telegramId === newUserId) {
            return res.json({ success: false, message: 'Geçersiz referans kodu' });
        }

        // Yeni kullanıcının referredBy alanını güncelle
        await User.findOneAndUpdate(
            { telegramId: newUserId },
            { referredBy: referrer.telegramId }
        );

        // Referans kazanç kaydı oluştur (Seviye 1 - %15)
        const level1Earning = new ReferralEarning({
            referrerId: referrer.telegramId,
            newUserId: newUserId,
            level: 1,
            percentage: 15
        });
        await level1Earning.save();

        // Referans sayısını güncelle
        await User.findOneAndUpdate(
            { telegramId: referrer.telegramId },
            { $inc: { referralCount: 1 } }
        );

        res.json({ success: true, message: 'Referans kaydedildi' });
    } catch (error) {
        console.error('Referans işleme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
