const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Bakiye sorgulama
router.get('/:userId/balance', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        res.json({
            balance: user.balance,
            level: user.level,
            dailyAdsWatched: user.dailyAdsWatched,
            dailyAdLimit: user.dailyAdLimit
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Kullanıcı istatistikleri
router.get('/:userId/stats', async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: req.params.userId });
        
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        res.json({
            balance: user.balance,
            totalEarned: user.totalEarned,
            totalWithdrawn: user.totalWithdrawn,
            level: user.level,
            referralCount: user.referralCount,
            dailyAdsWatched: user.dailyAdsWatched,
            dailyAdLimit: user.dailyAdLimit
        });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Cüzdan adresi güncelleme
router.post('/:userId/wallet', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const user = await User.findOne({ telegramId: req.params.userId });
        
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        user.walletAddress = walletAddress;
        await user.save();

        res.json({ success: true, message: 'Cüzdan adresi güncellendi' });
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
