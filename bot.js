const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Telegram Bot
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Server API Configuration
const SERVER_CONFIG = {
    baseURL: process.env.SERVER_URL || 'http://localhost:3000'
};

// API Helper Functions
class ApiManager {
    constructor() {
        this.baseURL = SERVER_CONFIG.baseURL;
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await axios({
                url: `${this.baseURL}${endpoint}`,
                timeout: 10000,
                ...options
            });
            return response.data;
        } catch (error) {
            console.error(`API call failed: ${endpoint}`, error.message);
            throw error;
        }
    }

    async getUser(uid) {
        try {
            const response = await this.apiCall(`/api/user/${uid}`);
            return response.success ? response.data : null;
        } catch (error) {
            return null;
        }
    }

    async registerUser(uid, username, name, referrer = null) {
        try {
            const response = await this.apiCall('/api/user/register', {
                method: 'POST',
                data: { uid, username, name, referrer }
            });
            return response;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateBalance(uid, amount) {
        try {
            const response = await this.apiCall(`/api/user/${uid}/balance`, {
                method: 'POST',
                data: { amount }
            });
            return response;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getUserReferrals(uid) {
        try {
            const response = await this.apiCall(`/api/user/${uid}/referrals`);
            return response.success ? response.data : [];
        } catch (error) {
            return [];
        }
    }

    async getStats() {
        try {
            const response = await this.apiCall('/api/stats');
            return response.success ? response.data : null;
        } catch (error) {
            return null;
        }
    }
}

const api = new ApiManager();

// Bot Komutları

// /start komutu
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name;
    const startParam = match[1]; // Referans kodu

    try {
        let user = await api.getUser(userId);
        let isNewUser = false;
        let referrerId = null;

        // Referans parametresini işle
        if (startParam && startParam.startsWith('REF')) {
            referrerId = startParam.replace('REF', '').slice(0, -3);
        }

        // Yeni kullanıcı kaydet
        if (!user) {
            const registerResult = await api.registerUser(userId, username, msg.from.first_name, referrerId);
            
            if (registerResult.success) {
                user = registerResult.user;
                isNewUser = true;
            } else {
                await bot.sendMessage(chatId, '❌ Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.');
                return;
            }
        }

        // Hoş geldin mesajı
        const referralCode = `REF${userId}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
        const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${referralCode}`;
        
        let message = `🎉 *Hoş Geldiniz ${user.name || username}!* 🎉\n\n`;
        message += `💰 *Bakiyeniz:* $${user.balance.toFixed(2)}\n`;
        message += `👥 *Referans Sayınız:* ${user.refs_count || 0}\n`;
        message += `🏦 *Toplam Kazanç:* $${user.totalEarned?.toFixed(2) || user.balance.toFixed(2)}\n\n`;
        
        if (user.referrer) {
            const referrer = await api.getUser(user.referrer);
            message += `📋 *Sizi Davet Eden:* ${referrer ? referrer.name : 'Bilinmiyor'}\n\n`;
        }
        
        message += `🔗 *Referans Linkiniz:*\n\`${referralLink}\`\n\n`;
        message += `Bu linki paylaşarak arkadaşlarınızı davet edin ve her biri için *$${process.env.REFERRAL_BONUS}* kazanın!`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: "👥 Referanslarım", callback_data: "my_referrals" },
                    { text: "💰 Bakiyem", callback_data: "my_balance" }
                ],
                [
                    { text: "📊 İstatistikler", callback_data: "stats" },
                    { text: "🏆 Sıralama", callback_data: "leaderboard" }
                ],
                [
                    { text: "📢 Kanalımız", url: "https://t.me/Torrelabs" },
                    { text: "💬 Grubumuz", url: "https://t.me/torreAdsChat" }
                ]
            ]
        };

        await bot.sendMessage(chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('Start command error:', error);
        await bot.sendMessage(chatId, '❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    }
});

// /balance komutu
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
        const user = await api.getUser(userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ Kullanıcı bulunamadı. Lütfen /start yazarak kaydolun.');
            return;
        }

        const message = `💰 *Bakiye Bilgileriniz*\n\n` +
                       `💵 Mevcut Bakiye: $${user.balance.toFixed(2)}\n` +
                       `🏦 Toplam Kazanç: $${user.totalEarned?.toFixed(2) || user.balance.toFixed(2)}\n` +
                       `👥 Referans Sayısı: ${user.refs_count || 0}\n` +
                       `📤 Minimum Çekim: $${process.env.MIN_WITHDRAW}\n\n` +
                       `💡 Daha fazla kazanmak için referanslarınızı davet edin!`;

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Balance command error:', error);
        await bot.sendMessage(chatId, '❌ Bir hata oluştu.');
    }
});

// /referrals komutu
bot.onText(/\/referrals/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    try {
        const user = await api.getUser(userId);
        if (!user) {
            await bot.sendMessage(chatId, '❌ Kullanıcı bulunamadı.');
            return;
        }

        const referrals = await api.getUserReferrals(userId);
        const referralEarnings = referrals.length * parseFloat(process.env.REFERRAL_BONUS);
        const referralCode = `REF${userId}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
        const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${referralCode}`;
        
        let message = `📊 *Referans Bilgileriniz*\n\n`;
        message += `👥 Toplam Referans: ${referrals.length}\n`;
        message += `💰 Referans Kazancı: $${referralEarnings.toFixed(2)}\n\n`;
        
        if (referrals.length > 0) {
            message += `📋 Son 10 Referans:\n`;
            referrals.slice(0, 10).forEach((ref, index) => {
                message += `${index + 1}. ${ref.name} (@${ref.username})\n`;
            });
            if (referrals.length > 10) {
                message += `... ve ${referrals.length - 10} kişi daha\n`;
            }
            message += `\n`;
        }
        
        message += `🔗 *Referans Linkiniz:*\n\`${referralLink}\`\n\n`;
        message += `Her referans için *$${process.env.REFERRAL_BONUS}* kazanıyorsunuz!`;

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error('Referrals command error:', error);
        await bot.sendMessage(chatId, '❌ Bir hata oluştu.');
    }
});

// Callback queries
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const userId = callbackQuery.from.id.toString();
    const data = callbackQuery.data;

    try {
        const user = await api.getUser(userId);
        if (!user) {
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Kullanıcı bulunamadı' });
            return;
        }

        switch (data) {
            case 'my_referrals':
                const referrals = await api.getUserReferrals(userId);
                const referralEarnings = referrals.length * parseFloat(process.env.REFERRAL_BONUS);
                const referralCode = `REF${userId}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
                const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${referralCode}`;
                
                let referralMessage = `📊 *Referans Bilgileriniz*\n\n`;
                referralMessage += `👥 Toplam Referans: ${referrals.length}\n`;
                referralMessage += `💰 Referans Kazancı: $${referralEarnings.toFixed(2)}\n\n`;
                
                if (referrals.length > 0) {
                    referralMessage += `📋 Son 5 Referans:\n`;
                    referrals.slice(0, 5).forEach((ref, index) => {
                        referralMessage += `${index + 1}. ${ref.name} (@${ref.username})\n`;
                    });
                    if (referrals.length > 5) {
                        referralMessage += `... ve ${referrals.length - 5} kişi daha\n`;
                    }
                    referralMessage += `\n`;
                }
                
                referralMessage += `🔗 *Referans Linkiniz:*\n\`${referralLink}\`\n\n`;
                referralMessage += `Her referans için *$${process.env.REFERRAL_BONUS}* kazanıyorsunuz!`;

                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.editMessageText(referralMessage, {
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                break;

            case 'my_balance':
                let balanceMessage = `💰 *Bakiye Bilgileriniz*\n\n`;
                balanceMessage += `💵 Mevcut Bakiye: $${user.balance.toFixed(2)}\n`;
                balanceMessage += `🏦 Toplam Kazanç: $${user.totalEarned?.toFixed(2) || user.balance.toFixed(2)}\n`;
                balanceMessage += `👥 Referans Sayısı: ${user.refs_count || 0}\n`;
                balanceMessage += `📤 Minimum Çekim: $${process.env.MIN_WITHDRAW}\n\n`;
                balanceMessage += `💡 Daha fazla kazanmak için referanslarınızı davet edin!`;

                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.editMessageText(balanceMessage, {
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                break;

            case 'stats':
                const stats = await api.getStats();
                let statsMessage = `📈 *Sistem İstatistikleri*\n\n`;
                if (stats) {
                    statsMessage += `👥 Toplam Kullanıcı: ${stats.totalUsers}\n`;
                    statsMessage += `💰 Toplam Bakiye: $${stats.totalBalance.toFixed(2)}\n`;
                    statsMessage += `🔗 Toplam Referans: ${stats.totalReferrals}\n`;
                    statsMessage += `🕒 Son Güncelleme: ${new Date(stats.metadata.lastUpdate).toLocaleString('tr-TR')}\n`;
                } else {
                    statsMessage += `❌ İstatistikler yüklenemedi\n`;
                }

                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.editMessageText(statsMessage, {
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                break;

            case 'leaderboard':
                // Bu kısım için API endpoint eklenmeli
                let leaderboardMessage = `🏆 *Liderlik Tablosu*\n\n`;
                leaderboardMessage += `⏳ Yakında eklenecek...\n\n`;
                leaderboardMessage += `Şimdilik /referrals komutu ile referans sayınızı görüntüleyebilirsiniz.`;

                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.editMessageText(leaderboardMessage, {
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
                break;
        }
    } catch (error) {
        console.error('Callback error:', error);
        await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Bir hata oluştu' });
    }
});

// API Routes for Mini App
app.get('/api/user/:userId', async (req, res) => {
    try {
        const user = await api.getUser(req.params.userId);
        if (user) {
            res.json({ success: true, data: user });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/user/:userId/points', async (req, res) => {
    try {
        const { points } = req.body;
        const result = await api.updateBalance(req.params.userId, points);
        
        if (result.success) {
            res.json({ success: true, newBalance: result.balance });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🤖 Bot server running on port ${PORT}`);
    console.log(`🔗 Bot is running as @${process.env.BOT_USERNAME}`);
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
