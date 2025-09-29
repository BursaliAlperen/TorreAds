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

// JSONBin.io Configuration
const JSONBIN_CONFIG = {
    apiKey: process.env.JSONBIN_API_KEY,
    binId: process.env.JSONBIN_BIN_ID,
    baseURL: 'https://api.jsonbin.io/v3/b'
};

// JSONBin.io Helper Functions
class JsonBinManager {
    constructor() {
        this.headers = {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_CONFIG.apiKey
        };
    }

    async getData() {
        try {
            const response = await axios.get(`${JSONBIN_CONFIG.baseURL}/${JSONBIN_CONFIG.binId}/latest`, {
                headers: { 'X-Master-Key': JSONBIN_CONFIG.apiKey }
            });
            return response.data.record || { users: {} };
        } catch (error) {
            console.error('JSONBin get error:', error.message);
            return { users: {} };
        }
    }

    async saveData(data) {
        try {
            const response = await axios.put(`${JSONBIN_CONFIG.baseURL}/${JSONBIN_CONFIG.binId}`, data, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error('JSONBin save error:', error.message);
            throw error;
        }
    }

    async getUser(userId) {
        const data = await this.getData();
        return data.users[userId] || null;
    }

    async createUser(userData) {
        const data = await this.getData();
        data.users[userData.userId] = userData;
        await this.saveData(data);
        return userData;
    }

    async updateUser(userId, updates) {
        const data = await this.getData();
        if (data.users[userId]) {
            data.users[userId] = { ...data.users[userId], ...updates };
            await this.saveData(data);
            return data.users[userId];
        }
        return null;
    }

    async addReferral(referrerId, referredUserId) {
        const data = await this.getData();
        
        if (data.users[referrerId]) {
            // Add referral to referrer's list
            if (!data.users[referrerId].referrals) {
                data.users[referrerId].referrals = [];
            }
            
            // Prevent duplicate referrals
            if (!data.users[referrerId].referrals.includes(referredUserId)) {
                data.users[referrerId].referrals.push(referredUserId);
                
                // Add bonus points to referrer
                data.users[referrerId].points += parseFloat(process.env.REFERRAL_BONUS);
                
                await this.saveData(data);
                return true;
            }
        }
        return false;
    }

    async addPoints(userId, points) {
        const data = await this.getData();
        if (data.users[userId]) {
            data.users[userId].points += points;
            await this.saveData(data);
            return data.users[userId].points;
        }
        return null;
    }

    async deductPoints(userId, points) {
        const data = await this.getData();
        if (data.users[userId] && data.users[userId].points >= points) {
            data.users[userId].points -= points;
            await this.saveData(data);
            return data.users[userId].points;
        }
        return null;
    }
}

const jsonBin = new JsonBinManager();

// Generate unique referral code
function generateRefCode(userId) {
    return `REF${userId.toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
}

// Bot Commands
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name;
    const startParam = match[1]; // Referral code from deep link

    try {
        let user = await jsonBin.getUser(userId);
        let isNewUser = false;
        let referralApplied = false;

        // Create new user if doesn't exist
        if (!user) {
            const refCode = generateRefCode(userId);
            user = await jsonBin.createUser({
                userId: userId,
                username: username,
                refCode: refCode,
                referredBy: null,
                referrals: [],
                points: parseFloat(process.env.WELCOME_BONUS),
                totalEarned: parseFloat(process.env.WELCOME_BONUS),
                hasJoinedChannel: false,
                hasJoinedGroup: false,
                dailyAdsWatched: 0,
                lastAdDate: null,
                joinedAt: new Date().toISOString(),
                lastActivity: new Date().toISOString()
            });
            isNewUser = true;
        }

        // Handle referral if start parameter exists and user is new
        if (startParam && startParam.startsWith('REF') && isNewUser) {
            const referrerCode = startParam;
            
            // Find referrer by code
            const data = await jsonBin.getData();
            const referrer = Object.values(data.users).find(u => u.refCode === referrerCode);
            
            if (referrer && referrer.userId !== userId) { // Prevent self-referral
                user.referredBy = referrer.userId;
                await jsonBin.updateUser(userId, { referredBy: referrer.userId });
                
                // Add bonus to referrer
                await jsonBin.addReferral(referrer.userId, userId);
                referralApplied = true;
            }
        }

        // Update last activity
        await jsonBin.updateUser(userId, { lastActivity: new Date().toISOString() });

        // Send welcome message with referral info
        const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${user.refCode}`;
        
        let message = `🎉 *Hoş Geldiniz ${username}!* 🎉\n\n`;
        message += `💰 *Bakiyeniz:* $${user.points.toFixed(2)}\n`;
        
        if (isNewUser) {
            message += `🎁 *Hoş geldin bonusu:* $${process.env.WELCOME_BONUS}\n`;
        }
        
        if (referralApplied) {
            message += `👥 *Referans bonusu:* $${process.env.REFERRAL_BONUS}\n`;
        }
        
        message += `\n📊 *İstatistikler:*\n`;
        message += `• Toplam Kazanç: $${user.totalEarned?.toFixed(2) || '0.00'}\n`;
        message += `• Referanslar: ${user.referrals?.length || 0}\n`;
        message += `• Günlük Reklam: ${user.dailyAdsWatched || 0}/100\n`;
        
        message += `\n🔗 *Referans Linkiniz:*\n\`${referralLink}\`\n\n`;
        message += `Bu linki paylaşarak arkadaşlarınızı davet edin ve her biri için *$${process.env.REFERRAL_BONUS}* kazanın!`;

        const keyboard = {
            inline_keyboard: [
                [
                    { 
                        text: "📱 Mini App'i Aç", 
                        web_app: { url: `https://your-domain.com/mini-app?user=${userId}` } 
                    }
                ],
                [
                    { text: "👥 Referanslarım", callback_data: "my_referrals" },
                    { text: "💰 Bakiyem", callback_data: "my_balance" }
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

// Callback queries
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const userId = callbackQuery.from.id.toString();
    const data = callbackQuery.data;

    try {
        const user = await jsonBin.getUser(userId);
        if (!user) return;

        switch (data) {
            case 'my_referrals':
                const referralCount = user.referrals?.length || 0;
                const referralEarnings = referralCount * parseFloat(process.env.REFERRAL_BONUS);
                const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=${user.refCode}`;
                
                let referralMessage = `📊 *Referans Bilgileriniz*\n\n`;
                referralMessage += `👥 Toplam Referans: ${referralCount}\n`;
                referralMessage += `💰 Referans Kazancı: $${referralEarnings.toFixed(2)}\n`;
                referralMessage += `🎯 Hedef: Daha fazla arkadaş davet et!\n\n`;
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
                balanceMessage += `💵 Mevcut Bakiye: $${user.points.toFixed(2)}\n`;
                balanceMessage += `🏦 Toplam Kazanç: $${user.totalEarned?.toFixed(2) || '0.00'}\n`;
                balanceMessage += `📤 Minimum Çekim: $${process.env.MIN_WITHDRAW}\n\n`;
                balanceMessage += `💡 Mini App içinden reklam izleyerek ve görevleri tamamlayarak daha fazla kazanabilirsiniz!`;

                await bot.answerCallbackQuery(callbackQuery.id);
                await bot.editMessageText(balanceMessage, {
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
        const user = await jsonBin.getUser(req.params.userId);
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
        const { points, type } = req.body;
        const user = await jsonBin.getUser(req.params.userId);
        
        if (user) {
            // Check daily ad limit
            const today = new Date().toISOString().slice(0, 10);
            if (type === 'ad_watch') {
                if (user.lastAdDate !== today) {
                    user.dailyAdsWatched = 0;
                    user.lastAdDate = today;
                }
                if (user.dailyAdsWatched >= 100) {
                    return res.json({ success: false, error: 'Daily ad limit reached' });
                }
                user.dailyAdsWatched++;
            }

            const newPoints = await jsonBin.addPoints(req.params.userId, points);
            await jsonBin.updateUser(req.params.userId, { 
                totalEarned: (user.totalEarned || 0) + points,
                dailyAdsWatched: user.dailyAdsWatched,
                lastAdDate: user.lastAdDate
            });

            res.json({ success: true, newBalance: newPoints });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/user/:userId/withdraw', async (req, res) => {
    try {
        const { amount, tonAddress } = req.body;
        const user = await jsonBin.getUser(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (amount < parseFloat(process.env.MIN_WITHDRAW)) {
            return res.json({ success: false, error: `Minimum withdrawal is $${process.env.MIN_WITHDRAW}` });
        }

        if (user.points < amount) {
            return res.json({ success: false, error: 'Insufficient balance' });
        }

        // Validate TON address
        if (!tonAddress.match(/^(EQ|UQ)[a-zA-Z0-9_-]{48}$/)) {
            return res.json({ success: false, error: 'Invalid TON address' });
        }

        const newBalance = await jsonBin.deductPoints(req.params.userId, amount);
        
        // Send withdrawal notification to admin
        const adminMessage = `💸 *Yeni Çekim Talebi!*\n\n` +
                           `👤 Kullanıcı: ${user.username}\n` +
                           `🆔 ID: ${user.userId}\n` +
                           `💵 Miktar: $${amount}\n` +
                           `👛 TON Adresi: ${tonAddress}\n` +
                           `⏰ Zaman: ${new Date().toLocaleString('tr-TR')}`;

        await bot.sendMessage(process.env.ADMIN_CHAT_ID || user.userId, adminMessage, { parse_mode: 'Markdown' });

        res.json({ success: true, newBalance: newBalance });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/user/:userId/update-task', async (req, res) => {
    try {
        const { taskType, completed } = req.body;
        const user = await jsonBin.getUser(req.params.userId);
        
        if (user) {
            const updates = {};
            let bonus = 0;

            switch (taskType) {
                case 'join_channel':
                    if (!user.hasJoinedChannel && completed) {
                        updates.hasJoinedChannel = true;
                        bonus = parseFloat(process.env.CHANNEL_JOIN_BONUS);
                    }
                    break;
                case 'join_group':
                    if (!user.hasJoinedGroup && completed) {
                        updates.hasJoinedGroup = true;
                        bonus = parseFloat(process.env.GROUP_JOIN_BONUS);
                    }
                    break;
            }

            if (bonus > 0) {
                await jsonBin.addPoints(req.params.userId, bonus);
                await jsonBin.updateUser(req.params.userId, {
                    ...updates,
                    totalEarned: (user.totalEarned || 0) + bonus
                });
            }

            res.json({ success: true, bonus: bonus });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🤖 Bot is running as @${process.env.BOT_USERNAME}`);
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
