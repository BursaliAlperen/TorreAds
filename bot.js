const { Telegraf, Markup } = require('telegraf');
const UserService = require('../backend/services/UserService');
require('dotenv').config();

class TorreAdsBot {
    constructor() {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.userService = new UserService();
        this.initHandlers();
    }

    initHandlers() {
        this.bot.start(this.handleStart.bind(this));
        this.bot.command('balance', this.handleBalance.bind(this));
        this.bot.command('ads', this.handleAds.bind(this));
        this.bot.command('referral', this.handleReferral.bind(this));
        this.bot.command('withdraw', this.handleWithdraw.bind(this));
        this.bot.action(/watch_ad_(.+)/, this.handleWatchAd.bind(this));
    }

    async handleStart(ctx) {
        const userData = {
            telegramId: ctx.from.id.toString(),
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name
        };

        const user = await this.userService.getOrCreateUser(userData);
        
        const welcomeMessage = `🎉 **TorreAds'e Hoş Geldiniz!**\n\n` +
            `💰 **Bakiyeniz:** ${user.balance} TonCoin\n` +
            `⭐ **Seviye:** ${this.getLevelText(user.level)}\n` +
            `📊 **Günlük Limit:** ${user.dailyAdsWatched}/${user.dailyAdLimit} reklam\n\n` +
            `Reklam izleyerek TonCoin kazanın!`;

        await ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
                ['📺 Reklam İzle', '💰 Bakiyem'],
                ['👥 Referanslarım', '💳 Para Çek']
            ]).resize()
        });

        // Referans kontrolü
        const referralCode = ctx.startPayload;
        if (referralCode && referralCode !== userData.telegramId) {
            await this.handleReferralJoin(userData.telegramId, referralCode);
        }
    }

    async handleBalance(ctx) {
        const user = await this.userService.getUser(ctx.from.id.toString());
        
        const balanceMessage = `💰 **Bakiyeniz:** ${user.balance} TonCoin\n\n` +
            `📊 **Günlük Durum:** ${user.dailyAdsWatched}/${user.dailyAdLimit} reklam\n` +
            `⭐ **Seviye:** ${this.getLevelText(user.level)}\n` +
            `🏆 **Toplam Kazanç:** ${user.totalEarned} TonCoin`;

        await ctx.reply(balanceMessage, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.webApp('📱 Mini App\'te İzle', 'https://t.me/TorreAdsBot/mini-app')
            ])
        });
    }

    async handleAds(ctx) {
        // Reklam listesi göster
        const adsMessage = `📺 **Mevcut Reklamlar**\n\n` +
            `Mini App üzerinden reklam izleyerek TonCoin kazanabilirsiniz!\n\n` +
            `🎬 Kısa video reklamlar\n` +
            `📱 Görsel reklamlar\n` +
            `💰 Anında ödeme`;

        await ctx.reply(adsMessage, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.webApp('🎬 Reklam İzle', 'https://t.me/TorreAdsBot/mini-app')
            ])
        });
    }

    async handleReferral(ctx) {
        const user = await this.userService.getUser(ctx.from.id.toString());
        
        const referralMessage = `👥 **Referans Sistemimiz**\n\n` +
            `🔗 **Referans Linkiniz:**\n` +
            `https://t.me/TorreAdsBot?start=${user.referralCode}\n\n` +
            `📊 **Referans Sayınız:** ${user.referralCount} kişi\n\n` +
            `💰 **Komisyon Oranları:**\n` +
            `• 1. Seviye: %15 komisyon\n` +
            `• 2. Seviye: %7 komisyon\n` +
            `• 3. Seviye: %3 komisyon`;

        await ctx.reply(referralMessage, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.url('📱 Linki Paylaş', `https://t.me/share/url?url=https://t.me/TorreAdsBot?start=${user.referralCode}`)
            ])
        });
    }

    async handleWithdraw(ctx) {
        const user = await this.userService.getUser(ctx.from.id.toString());
        
        if (user.balance < 5) {
            return ctx.reply('❌ Minimum çekim miktarı 5 TonCoin\'dir.');
        }

        const withdrawMessage = `💳 **Para Çekme**\n\n` +
            `💰 **Mevcut Bakiye:** ${user.balance} TonCoin\n` +
            `💼 **Minimum Çekim:** 5 TonCoin\n\n` +
            `Para çekmek için Mini App'i kullanın:`;

        await ctx.reply(withdrawMessage, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.webApp('💳 Mini App\'te Çek', 'https://t.me/TorreAdsBot/mini-app')
            ])
        });
    }

    getLevelText(level) {
        const levels = {
            bronze: '🥉 Bronz',
            silver: '🥈 Gümüş', 
            gold: '🥇 Altın',
            platinum: '💎 Platin'
        };
        return levels[level] || '🥉 Bronz';
    }

    async handleReferralJoin(newUserId, referrerCode) {
        try {
            await fetch('http://localhost:3000/api/referral/handle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newUserId,
                    referrerCode
                })
            });
        } catch (error) {
            console.error('Referans işleme hatası:', error);
        }
    }

    launch() {
        this.bot.launch();
        console.log('🤖 TorreAds Telegram botu çalışıyor...');
    }
}

module.exports = TorreAdsBot;
