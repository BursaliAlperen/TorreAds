const { Telegraf, Markup, session } = require('telegraf');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./database.sqlite');

// Veritabanı tablolarını oluştur
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        username TEXT,
        first_name TEXT,
        balance DECIMAL(15,2) DEFAULT 0,
        total_earned DECIMAL(15,2) DEFAULT 0,
        total_withdrawn DECIMAL(15,2) DEFAULT 0,
        referral_code TEXT UNIQUE,
        referred_by INTEGER,
        watch_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrer_id INTEGER,
        referred_id INTEGER,
        earned_amount DECIMAL(15,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(referrer_id) REFERENCES users(telegram_id),
        FOREIGN KEY(referred_id) REFERENCES users(telegram_id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount DECIMAL(15,2),
        ton_address TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(telegram_id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS ads_watched (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        ad_id INTEGER,
        earned_amount DECIMAL(15,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(telegram_id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS daily_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT,
        ads_watched INTEGER DEFAULT 0,
        earned_today DECIMAL(15,2) DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(telegram_id)
    )`);
});

// Yardımcı fonksiyonlar
function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRandomEarning() {
    return (Math.random() * (2 - 0.8) + 0.8).toFixed(2);
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Kullanıcı işlemleri
async function getUser(telegramId) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE telegram_id = ?", [telegramId], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
}

async function createUser(telegramId, userInfo, referredBy = null) {
    const referralCode = generateReferralCode();
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO users (telegram_id, username, first_name, referral_code, referred_by) VALUES (?, ?, ?, ?, ?)", 
               [telegramId, userInfo.username, userInfo.first_name, referralCode, referredBy], function(err) {
            if (err) reject(err);
            resolve({ id: this.lastID, referralCode });
        });
    });
}

async function getDailyLimit(userId) {
    const today = getTodayDate();
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM daily_limits WHERE user_id = ? AND date = ?", 
               [userId, today], (err, row) => {
            if (err) reject(err);
            if (!row) {
                db.run("INSERT INTO daily_limits (user_id, date) VALUES (?, ?)", 
                       [userId, today], function(err) {
                    if (err) reject(err);
                    resolve({ user_id: userId, date: today, ads_watched: 0, earned_today: 0 });
                });
            } else {
                resolve(row);
            }
        });
    });
}

// API Routes for Mini App
app.post('/api/user-data', async (req, res) => {
    try {
        const { initDataUnsafe } = req.body;
        const userId = initDataUnsafe?.user?.id;
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await getUser(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const dailyLimit = await getDailyLimit(userId);
        
        res.json({
            balance: user.balance,
            watch_count: user.watch_count,
            daily_watched: dailyLimit.ads_watched,
            daily_earned: dailyLimit.earned_today,
            total_earned: user.total_earned
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/earn', async (req, res) => {
    try {
        const { initDataUnsafe, earned } = req.body;
        const userId = initDataUnsafe?.user?.id;
        
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await getUser(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const dailyLimit = await getDailyLimit(userId);
        
        // Günlük limit kontrolü (50 reklam/gün)
        if (dailyLimit.ads_watched >= 50) {
            return res.status(400).json({ error: 'Daily limit reached' });
        }
        
        const earnedAmount = parseFloat(earned);
        
        // Kullanıcı bakiyesini güncelle
        db.run("UPDATE users SET balance = balance + ?, total_earned = total_earned + ?, watch_count = watch_count + 1 WHERE telegram_id = ?",
               [earnedAmount, earnedAmount, userId]);
        
        // Günlük limiti güncelle
        db.run("UPDATE daily_limits SET ads_watched = ads_watched + 1, earned_today = earned_today + ? WHERE user_id = ? AND date = ?",
               [earnedAmount, userId, getTodayDate()]);
        
        // Reklam izleme geçmişine ekle
        db.run("INSERT INTO ads_watched (user_id, earned_amount) VALUES (?, ?)",
               [userId, earnedAmount]);
        
        // Referans varsa referansına %10 komisyon ver
        if (user.referred_by) {
            const commission = earnedAmount * 0.1;
            db.run("UPDATE users SET balance = balance + ? WHERE telegram_id = ?",
                   [commission, user.referred_by]);
            db.run("INSERT INTO referrals (referrer_id, referred_id, earned_amount) VALUES (?, ?, ?)",
                   [user.referred_by, userId, commission]);
        }
        
        const newBalance = (user.balance || 0) + earnedAmount;
        res.json({ 
            success: true, 
            newBalance: newBalance,
            daily_watched: dailyLimit.ads_watched + 1,
            daily_earned: (dailyLimit.earned_today || 0) + earnedAmount
        });
    } catch (error) {
        console.error('Earn API Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Bot komutları
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const referralCode = ctx.startPayload;

    let user = await getUser(userId);
    
    if (!user) {
        user = await createUser(userId, ctx.from, referralCode || null);
        
        // Referans bonusu
        if (referralCode) {
            const referrer = await new Promise((resolve) => {
                db.get("SELECT * FROM users WHERE referral_code = ?", [referralCode], (err, row) => {
                    resolve(row);
                });
            });
            
            if (referrer) {
                const referralBonus = 15.00;
                db.run("UPDATE users SET balance = balance + ? WHERE telegram_id = ?", 
                       [referralBonus, referrer.telegram_id]);
                db.run("INSERT INTO referrals (referrer_id, referred_id, earned_amount) VALUES (?, ?, ?)",
                       [referrer.telegram_id, userId, referralBonus]);
                
                await ctx.reply(`🎉 Yeni referansınız var! +15 TON bonus kazandınız.`);
            }
        }
        
        await ctx.reply(`🏰 *TorreAds'e Hoş Geldiniz!*\n\n` +
                       `🎬 Reklam izleyerek TON kazanın\n` +
                       `👥 Arkadaşlarınızı davet edin\n` +
                       `💎 Kazançlarınızı TON cinsinden çekin\n\n` +
                       `*Kullanım Şartları:* https://telegra.ph/TorreAds-User-Agreement-01-01`,
                       { parse_mode: 'Markdown' });
    }
    
    await showMainMenu(ctx);
});

bot.command('stats', async (ctx) => {
    await ctx.deleteMessage();
    await showStatsMenu(ctx);
});

bot.command('referral', async (ctx) => {
    await ctx.deleteMessage();
    await showReferralMenu(ctx);
});

async function showMainMenu(ctx) {
    const user = await getUser(ctx.from.id);
    const dailyLimit = await getDailyLimit(ctx.from.id);
    
    const menuText = `🏰 *TorreAds - TON Kazanma Botu* 🏰

💰 *Bakiye:* ${user.balance || 0} TON
📊 *Toplam Kazanç:* ${user.total_earned || 0} TON
🎬 *İzlenen Reklam:* ${user.watch_count || 0}
📅 *Bugün:* ${dailyLimit.ads_watched}/50 reklam

💎 *Minimum Çekim:* 1 TON
⚡ *Günlük Limit:* 50 reklam`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp("🎬 Reklam İzle & TON Kazan", process.env.MINI_APP_URL)],
        [Markup.button.callback("💰 Bakiye", "balance"), Markup.button.callback("👥 Referans", "referral")],
        [Markup.button.callback("💳 Para Çek", "withdraw"), Markup.button.callback("📊 İstatistik", "stats")],
        [Markup.button.callback("ℹ️ Yardım", "help")]
    ]);
    
    if (ctx.updateType === 'callback_query') {
        await ctx.editMessageText(menuText, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } else {
        await ctx.reply(menuText, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    }
}

// Bakiye menüsü
bot.action('balance', async (ctx) => {
    const user = await getUser(ctx.from.id);
    const dailyLimit = await getDailyLimit(ctx.from.id);
    
    const balanceText = `💰 *Bakiye Bilgileri*

💎 *Mevcut Bakiye:* ${user.balance || 0} TON
📈 *Toplam Kazanç:* ${user.total_earned || 0} TON
💸 *Toplam Çekim:* ${user.total_withdrawn || 0} TON
📅 *Bugünkü Kazanç:* ${dailyLimit.earned_today || 0} TON

🎯 *Minimum çekim miktarı:* 1 TON
⚡ *Günlük limit:* 50 reklam`;
    
    await ctx.editMessageText(balanceText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔙 Ana Menü", "main_menu")]
        ])
    });
});

// Referans menüsü
bot.action('referral', async (ctx) => {
    await showReferralMenu(ctx);
});

async function showReferralMenu(ctx) {
    const user = await getUser(ctx.from.id);
    
    const referralCount = await new Promise((resolve) => {
        db.get("SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?", 
               [ctx.from.id], (err, row) => resolve(row?.count || 0));
    });
    
    const referralEarnings = await new Promise((resolve) => {
        db.get("SELECT SUM(earned_amount) as total FROM referrals WHERE referrer_id = ?", 
               [ctx.from.id], (err, row) => resolve(row?.total || 0));
    });
    
    const referralText = `👥 *TorreAds Referans Sistemi*

🔗 *Referans Linkiniz:*
https://t.me/TorreAds_Bot?start=${user.referral_code}

📊 *Referans İstatistikleri:*
• Toplam Referans: ${referralCount} kişi
• Referans Kazancı: ${referralEarnings || 0} TON

🎁 *Referans Bonusları:*
• Yeni üye için: 🎉 15 TON bonus
• Referans kazancı: 💰 %10 komisyon
• Limit yok: 🚀 sınırsız referans

💡 *İpucu:* Linkinizi paylaşın, hem bonus hem komisyon kazanın!`;
    
    await ctx.editMessageText(referralText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("📤 Linki Paylaş", "share_referral")],
            [Markup.button.callback("🔙 Ana Menü", "main_menu")]
        ])
    });
}

bot.action('share_referral', async (ctx) => {
    const user = await getUser(ctx.from.id);
    const referralLink = `https://t.me/TorreAds_Bot?start=${user.referral_code}`;
    
    await ctx.editMessageText(`🔗 *Referans Linkiniz:*\n\n\`${referralLink}\`\n\n` +
                             `Bu linki arkadaşlarınızla paylaşarak TON kazanmaya başlayın! 🎉`,
                             {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔙 Referans Menüsü", "referral")],
            [Markup.button.callback("🔙 Ana Menü", "main_menu")]
        ])
    });
});

// Para çekme menüsü
bot.action('withdraw', async (ctx) => {
    const user = await getUser(ctx.from.id);
    
    if (user.balance < 1) {
        await ctx.answerCbQuery(`❌ Minimum çekim miktarı 1 TON! Mevcut bakiyeniz: ${user.balance} TON`);
        return;
    }
    
    const withdrawText = `💳 *TON Coin Çekim*

💰 *Mevcut Bakiye:* ${user.balance} TON
💎 *Minimum Çekim:* 1 TON

⚠️ Lütfen TON cüzdan adresinizi gönderiniz:

*Örnek:* EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N`;
    
    await ctx.editMessageText(withdrawText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔙 Ana Menü", "main_menu")]
        ])
    });
    
    ctx.session = { waitingForTonAddress: true };
});

// İstatistik menüsü
bot.action('stats', async (ctx) => {
    await showStatsMenu(ctx);
});

async function showStatsMenu(ctx) {
    const user = await getUser(ctx.from.id);
    const dailyLimit = await getDailyLimit(ctx.from.id);
    
    const totalUsers = await new Promise((resolve) => {
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => resolve(row?.count || 0));
    });
    
    const totalAds = await new Promise((resolve) => {
        db.get("SELECT COUNT(*) as count FROM ads_watched", (err, row) => resolve(row?.count || 0));
    });
    
    const totalWithdrawals = await new Promise((resolve) => {
        db.get("SELECT SUM(amount) as total FROM withdrawals WHERE status = 'completed'", 
               (err, row) => resolve(row?.total || 0));
    });
    
    const statsText = `📊 *TorreAds İstatistikleri*

👥 *Toplam Kullanıcı:* ${totalUsers}
🎬 *Toplam İzlenen Reklam:* ${totalAds}
💸 *Toplam Dağıtılan TON:* ${totalWithdrawals || 0} TON

👤 *Kişisel İstatistikler:*
• Toplam Kazanç: ${user.total_earned || 0} TON
• İzlenen Reklam: ${user.watch_count || 0}
• Bugün: ${dailyLimit.ads_watched}/50 reklam
• Toplam Çekim: ${user.total_withdrawn || 0} TON

🏰 *TorreAds - Güvenilir TON Kazanç Platformu*`;
    
    await ctx.editMessageText(statsText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔙 Ana Menü", "main_menu")]
        ])
    });
}

// Yardım menüsü
bot.action('help', async (ctx) => {
    const helpText = `ℹ️ *TorreAds Yardım Merkezi*

🎬 *Reklam Nasıl İzlenir?*
1. "Reklam İzle & TON Kazan" butonuna tıklayın
2. Mini App'te reklamı izleyin
3. 30 saniye sonra TON kazanacaksınız

👥 *Referans Sistemi*
• Her referans: 15 TON bonus
• Referans kazancı: %10 komisyon
• Sınırsız referans hakkı

💳 *Para Çekme*
• Minimum: 1 TON
• TON cüzdan adresi gerekiyor
• 24 saat içinde ödeme

📅 *Limitler*
• Günlük: 50 reklam
• Reklam başı: 0.8-2 TON

❓ *Sorularınız için:* @TorreAdsSupport`;
    
    await ctx.editMessageText(helpText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔙 Ana Menü", "main_menu")]
        ])
    });
});

// Ana menüye dönüş
bot.action('main_menu', async (ctx) => {
    await showMainMenu(ctx);
});

// Mesaj işleme (TON adresi için)
bot.on('text', async (ctx) => {
    if (ctx.session?.waitingForTonAddress) {
        const tonAddress = ctx.message.text.trim();
        const user = await getUser(ctx.from.id);
        
        // Basit TON adresi validasyonu
        if (!tonAddress.match(/^EQ[0-9a-zA-Z]{48}$/)) {
            await ctx.reply('❌ Geçersiz TON cüzdan adresi! Lütfen geçerli bir TON adresi girin.\n\n*Örnek:* EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N', 
                           { parse_mode: 'Markdown' });
            return;
        }
        
        if (user.balance < 1) {
            await ctx.reply('❌ Yetersiz bakiye! Minimum çekim 1 TON.');
            ctx.session = null;
            await showMainMenu(ctx);
            return;
        }
        
        // Çekim işlemini kaydet
        db.run("INSERT INTO withdrawals (user_id, amount, ton_address) VALUES (?, ?, ?)",
               [ctx.from.id, user.balance, tonAddress]);
        
        // Bakiyeyi sıfırla ve toplam çekimi güncelle
        db.run("UPDATE users SET balance = 0, total_withdrawn = total_withdrawn + ? WHERE telegram_id = ?",
               [user.balance, ctx.from.id]);
        
        await ctx.reply(`✅ *Çekim talebiniz alındı!*\n\n` +
                       `💎 *Miktar:* ${user.balance} TON\n` +
                       `📮 *Adres:* ${tonAddress}\n` +
                       `⏰ *Süre:* 24 saat içinde\n\n` +
                       `Lütfen ödemenin tamamlanmasını bekleyin. 🏰`,
                       { parse_mode: 'Markdown' });
        
        ctx.session = null;
        await showMainMenu(ctx);
    }
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Mini App sunucusu ${PORT} portunda çalışıyor`);
});

bot.launch();
console.log('🏰 TorreAds Bot başlatıldı!');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
