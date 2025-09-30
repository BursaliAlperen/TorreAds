const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');
const User = require('../models/User');

// Mevcut reklamları getir
router.get('/available', async (req, res) => {
    try {
        const ads = await Ad.find({ 
            isActive: true,
            $or: [
                { maxViews: { $gt: 0, $gt: '$currentViews' } },
                { maxViews: 0 }
            ]
        }).limit(10);

        res.json(ads);
    } catch (error) {
        console.error('Reklamlar yüklenemedi:', error);
        res.status(500).json({ error: 'Reklamlar yüklenemedi' });
    }
});

// Reklam izleme
router.post('/watch', async (req, res) => {
    try {
        const { adId, userId } = req.body;

        if (!adId || !userId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Eksik parametreler' 
            });
        }

        const user = await User.findOne({ telegramId: userId });
        const ad = await Ad.findById(adId);

        if (!user || !ad) {
            return res.json({ 
                success: false, 
                message: 'Kullanıcı veya reklam bulunamadı' 
            });
        }

        // Günlük limit kontrolü
        user.resetDailyLimit();
        
        if (user.dailyAdsWatched >= user.dailyAdLimit) {
            return res.json({ 
                success: false, 
                message: 'Günlük limitiniz doldu' 
            });
        }

        // 30 saniye bekleme kontrolü
        const now = new Date();
        if (user.lastAdWatch && (now - user.lastAdWatch) < 30000) {
            return res.json({ 
                success: false, 
                message: 'Lütfen 30 saniye bekleyin' 
            });
        }

        // Kazanç hesaplama
        const baseReward = ad.reward;
        const levelMultiplier = user.earnMultiplier;
        const finalReward = baseReward * levelMultiplier;

        // Kullanıcı bakiyesini güncelle
        user.balance += finalReward;
        user.totalEarned += finalReward;
        user.dailyAdsWatched += 1;
        user.lastAdWatch = now;
        await user.save();

        // Reklam görüntülenme sayısını güncelle
        await Ad.findByIdAndUpdate(adId, {
            $inc: { currentViews: 1 }
        });

        res.json({
            success: true,
            reward: finalReward,
            newBalance: user.balance,
            dailyRemaining: user.dailyAdLimit - user.dailyAdsWatched
        });

    } catch (error) {
        console.error('Reklam izleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sunucu hatası' 
        });
    }
});

// Yeni reklam ekleme (admin)
router.post('/', async (req, res) => {
    try {
        const adData = req.body;
        const ad = new Ad(adData);
        await ad.save();
        
        res.json({ success: true, ad });
    } catch (error) {
        res.status(500).json({ error: 'Reklam eklenemedi' });
    }
});

module.exports = router;a
