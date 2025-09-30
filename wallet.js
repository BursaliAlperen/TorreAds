const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Para çekme işlemi
router.post('/withdraw', async (req, res) => {
    try {
        const { userId, amount } = req.body;

        const user = await User.findOne({ telegramId: userId });
        if (!user) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }

        if (user.balance < amount) {
            return res.json({ success: false, message: 'Yetersiz bakiye' });
        }

        if (amount < 5) {
            return res.json({ success: false, message: 'Minimum çekim 5 TonCoin' });
        }

        if (!user.walletAddress) {
            return res.json({ success: false, message: 'Cüzdan adresi bulunamadı' });
        }

        // Bakiyeyi güncelle
        user.balance -= amount;
        user.totalWithdrawn += amount;
        await user.save();

        // Burada TonCoin gönderme işlemi yapılacak
        // TonService.sendPayment(user.walletAddress, amount);

        res.json({
            success: true,
            message: 'Çekim işlemi başlatıldı',
            newBalance: user.balance,
            transactionId: 'TX_' + Date.now()
        });

    } catch (error) {
        console.error('Para çekme hatası:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

module.exports = router;
