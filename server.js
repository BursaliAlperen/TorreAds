const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// JSONBin.io Configuration
const JSONBIN_CONFIG = {
    baseURL: 'https://api.jsonbin.io/v3/b',
    masterKey: process.env.JSONBIN_MASTER_KEY,
    binId: process.env.JSONBIN_BIN_ID
};

console.log('🚀 Starting JSONBin System with ID:', JSONBIN_CONFIG.binId);

// JSONBin Database Manager - Tüm kullanıcı işlemleri burada
class JsonBinDatabase {
    constructor() {
        this.baseURL = JSONBIN_CONFIG.baseURL;
        this.binId = JSONBIN_CONFIG.binId;
        this.masterKey = JSONBIN_CONFIG.masterKey;
        this.cache = null;
        this.lastFetch = 0;
        this.cacheTimeout = 10000; // 10 saniye cache
    }

    // JSONBin API çağrısı için yardımcı fonksiyon
    async fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios({
                    url,
                    timeout: 15000,
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': this.masterKey,
                        ...options.headers
                    }
                });
                return response;
            } catch (error) {
                console.log(`⏳ Attempt ${i + 1}/${retries} failed:`, error.message);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
            }
        }
    }

    // JSONBin'den veritabanını getir
    async getDatabase() {
        // Cache kontrolü
        if (this.cache && Date.now() - this.lastFetch < this.cacheTimeout) {
            return this.cache;
        }

        try {
            console.log('📥 Fetching database from JSONBin...');
            const response = await this.fetchWithRetry(`${this.baseURL}/${this.binId}/latest`);
            
            let data = response.data.record;
            
            // Eğer bin boşsa veya hatalıysa, yeni yapı oluştur
            if (!data || typeof data !== 'object') {
                console.log('🆕 Creating new database structure...');
                data = this.createDefaultDatabase();
                await this.saveDatabase(data);
            }
            
            // Veri yapısını doğrula ve gerekli alanları ekle
            data = this.validateDatabaseStructure(data);
            
            this.cache = data;
            this.lastFetch = Date.now();
            
            console.log(`✅ Database loaded. Total users: ${data.users.length}`);
            return data;
        } catch (error) {
            console.error('❌ Cannot connect to JSONBin:', error.message);
            // Fallback: varsayılan veritabanı döndür
            return this.createDefaultDatabase();
        }
    }

    // JSONBin'e veritabanını kaydet
    async saveDatabase(data) {
        try {
            console.log('💾 Saving database to JSONBin...');
            const response = await this.fetchWithRetry(`${this.baseURL}/${this.binId}`, {
                method: 'PUT',
                data: data
            });
            
            this.cache = data;
            this.lastFetch = Date.now();
            
            console.log('✅ Database saved successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Cannot save to JSONBin:', error.message);
            throw new Error('DATABASE_SAVE_FAILED: ' + error.message);
        }
    }

    // Varsayılan veritabanı yapısı
    createDefaultDatabase() {
        return { 
            users: [],
            metadata: { 
                totalUsers: 0,
                totalBalance: 0,
                totalReferrals: 0,
                version: '2.0',
                createdAt: new Date().toISOString(),
                lastUpdate: new Date().toISOString()
            } 
        };
    }

    // Veritabanı yapısını doğrula
    validateDatabaseStructure(data) {
        if (!Array.isArray(data.users)) data.users = [];
        if (!data.metadata) data.metadata = {};
        
        // Metadata alanlarını kontrol et
        data.metadata.totalUsers = data.users.length;
        data.metadata.totalBalance = data.users.reduce((sum, user) => sum + (user.balance || 0), 0);
        data.metadata.totalReferrals = data.users.reduce((sum, user) => sum + (user.refs_count || 0), 0);
        data.metadata.lastUpdate = new Date().toISOString();
        
        if (!data.metadata.version) data.metadata.version = '2.0';
        if (!data.metadata.createdAt) data.metadata.createdAt = new Date().toISOString();
        
        return data;
    }

    // Kullanıcıyı UID ile bul
    async getUser(uid) {
        const database = await this.getDatabase();
        return database.users.find(user => user.uid === uid) || null;
    }

    // Tüm kullanıcıları getir
    async getAllUsers() {
        const database = await this.getDatabase();
        return database.users;
    }

    // Yeni kullanıcı kaydet
    async registerUser(uid, username, name, referrer = null) {
        const database = await this.getDatabase();
        
        // Kullanıcı zaten var mı kontrol et
        const existingUser = database.users.find(user => user.uid === uid);
        if (existingUser) {
            return { 
                success: false, 
                message: "❌ User already exists", 
                user: existingUser 
            };
        }

        // Yeni kullanıcı objesi oluştur
        const newUser = {
            uid: uid,
            username: username,
            name: name,
            balance: parseFloat(process.env.WELCOME_BONUS) || 0,
            referrer: referrer,
            refs_count: 0,
            referrals: [],
            totalEarned: parseFloat(process.env.WELCOME_BONUS) || 0,
            created_at: new Date().toISOString(),
            last_update: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            status: 'active'
        };

        // Kullanıcıyı veritabanına ekle
        database.users.push(newUser);

        // Referans varsa, referrer'ın bilgilerini güncelle
        if (referrer) {
            const referrerUser = database.users.find(user => user.uid === referrer);
            if (referrerUser) {
                referrerUser.refs_count = (referrerUser.refs_count || 0) + 1;
                referrerUser.referrals.push(uid);
                referrerUser.last_update = new Date().toISOString();
                
                // Referans bonusu ekle
                referrerUser.balance += parseFloat(process.env.REFERRAL_BONUS) || 0;
                referrerUser.totalEarned += parseFloat(process.env.REFERRAL_BONUS) || 0;
                
                // Yeni kullanıcıya da referans bonusu ekle
                newUser.balance += parseFloat(process.env.REFERRAL_BONUS) || 0;
                newUser.totalEarned += parseFloat(process.env.REFERRAL_BONUS) || 0;
            }
        }

        // Metadata güncelle
        database.metadata.totalUsers = database.users.length;
        database.metadata.totalBalance = database.users.reduce((sum, user) => sum + user.balance, 0);
        database.metadata.totalReferrals = database.users.reduce((sum, user) => sum + (user.refs_count || 0), 0);
        database.metadata.lastUpdate = new Date().toISOString();

        // Veritabanını kaydet
        await this.saveDatabase(database);
        
        return { 
            success: true, 
            message: "✅ User registered successfully", 
            user: newUser 
        };
    }

    // Bakiye güncelle
    async updateBalance(uid, amount) {
        const database = await this.getDatabase();
        const user = database.users.find(user => user.uid === uid);
        
        if (!user) {
            return { 
                success: false, 
                message: "❌ User not found" 
            };
        }

        const newBalance = user.balance + parseFloat(amount);
        user.balance = newBalance;
        
        // Eğer pozitif miktar eklendiyse total earned'a ekle
        if (parseFloat(amount) > 0) {
            user.totalEarned += parseFloat(amount);
        }
        
        user.last_update = new Date().toISOString();
        user.last_activity = new Date().toISOString();

        // Metadata güncelle
        database.metadata.totalBalance = database.users.reduce((sum, user) => sum + user.balance, 0);
        database.metadata.lastUpdate = new Date().toISOString();

        await this.saveDatabase(database);
        
        return { 
            success: true, 
            message: `💰 Balance updated: $${newBalance.toFixed(2)}`, 
            balance: newBalance, 
            user: user 
        };
    }

    // İsim güncelle
    async updateName(uid, newName) {
        const database = await this.getDatabase();
        const user = database.users.find(user => user.uid === uid);
        
        if (!user) {
            return { 
                success: false, 
                message: "❌ User not found" 
            };
        }

        const oldName = user.name;
        user.name = newName;
        user.last_update = new Date().toISOString();
        user.last_activity = new Date().toISOString();

        database.metadata.lastUpdate = new Date().toISOString();
        await this.saveDatabase(database);
        
        return { 
            success: true, 
            message: `✏️ Name updated: ${oldName} → ${newName}`, 
            user: user 
        };
    }

    // Kullanıcı sil
    async deleteUser(uid) {
        const database = await this.getDatabase();
        const userIndex = database.users.findIndex(user => user.uid === uid);
        
        if (userIndex === -1) {
            return { 
                success: false, 
                message: "❌ User not found" 
            };
        }

        const deletedUser = database.users[userIndex];
        
        // Eğer kullanıcı birisi tarafından referans edilmişse, referrer'ın bilgilerini güncelle
        if (deletedUser.referrer) {
            const referrer = database.users.find(user => user.uid === deletedUser.referrer);
            if (referrer && referrer.refs_count > 0) {
                referrer.refs_count -= 1;
                referrer.referrals = referrer.referrals.filter(ref => ref !== uid);
                referrer.last_update = new Date().toISOString();
            }
        }

        // Kullanıcıyı listeden çıkar
        database.users.splice(userIndex, 1);

        // Metadata güncelle
        database.metadata.totalUsers = database.users.length;
        database.metadata.totalBalance = database.users.reduce((sum, user) => sum + user.balance, 0);
        database.metadata.totalReferrals = database.users.reduce((sum, user) => sum + (user.refs_count || 0), 0);
        database.metadata.lastUpdate = new Date().toISOString();

        await this.saveDatabase(database);
        
        return { 
            success: true, 
            message: "🗑️ User deleted successfully", 
            user: deletedUser 
        };
    }

    // Kullanıcının referanslarını getir
    async getUserReferrals(uid) {
        const database = await this.getDatabase();
        return database.users.filter(user => user.referrer === uid);
    }

    // Referanslı kullanıcıları getir (kimler bu kullanıcıyı referans etmiş)
    async getReferredUsers(uid) {
        const database = await this.getDatabase();
        return database.users.filter(user => user.referrer === uid);
    }

    // Veritabanı istatistiklerini getir
    async getDatabaseStats() {
        const database = await this.getDatabase();
        const totalBalance = database.users.reduce((sum, user) => sum + user.balance, 0);
        const totalReferrals = database.users.reduce((sum, user) => sum + (user.refs_count || 0), 0);
        const activeUsers = database.users.filter(user => user.status === 'active').length;
        
        return {
            totalUsers: database.users.length,
            totalBalance: totalBalance,
            totalReferrals: totalReferrals,
            activeUsers: activeUsers,
            metadata: database.metadata
        };
    }

    // Kullanıcı aktivitesini güncelle
    async updateUserActivity(uid) {
        const database = await this.getDatabase();
        const user = database.users.find(user => user.uid === uid);
        
        if (user) {
            user.last_activity = new Date().toISOString();
            database.metadata.lastUpdate = new Date().toISOString();
            await this.saveDatabase(database);
        }
    }

    // Top kullanıcıları getir (bakiye veya referans sayısına göre)
    async getTopUsers(by = 'balance', limit = 10) {
        const database = await this.getDatabase();
        const users = [...database.users];
        
        if (by === 'balance') {
            users.sort((a, b) => b.balance - a.balance);
        } else if (by === 'referrals') {
            users.sort((a, b) => (b.refs_count || 0) - (a.refs_count || 0));
        }
        
        return users.slice(0, limit);
    }
}

// Database instance oluştur
const db = new JsonBinDatabase();

// ==================== ROUTES ====================

// Debug endpoint - Tüm veritabanını göster
app.get('/api/debug/database', async (req, res) => {
    try {
        const stats = await db.getDatabaseStats();
        const users = await db.getAllUsers();
        
        res.json({
            success: true,
            stats: stats,
            users: users,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Kullanıcı bilgilerini getir
app.get('/api/user/:uid', async (req, res) => {
    try {
        const uid = req.params.uid;
        const user = await db.getUser(uid);
        
        if (user) {
            // Aktiviteyi güncelle
            await db.updateUserActivity(uid);
            
            res.json({
                success: true,
                data: user
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Yeni kullanıcı kaydet
app.post('/api/user/register', async (req, res) => {
    try {
        const { uid, username, name, referrer } = req.body;
        
        if (!uid || !username || !name) {
            return res.status(400).json({
                success: false,
                error: 'UID, username, and name are required'
            });
        }

        const result = await db.registerUser(uid, username, name, referrer || null);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bakiye güncelle
app.post('/api/user/:uid/balance', async (req, res) => {
    try {
        const uid = req.params.uid;
        const { amount } = req.body;
        
        if (typeof amount !== 'number' && isNaN(parseFloat(amount))) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be a valid number'
            });
        }

        const result = await db.updateBalance(uid, parseFloat(amount));
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// İsim güncelle
app.post('/api/user/:uid/name', async (req, res) => {
    try {
        const uid = req.params.uid;
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Name is required'
            });
        }

        const result = await db.updateName(uid, name.trim());
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Kullanıcı sil
app.delete('/api/user/:uid', async (req, res) => {
    try {
        const uid = req.params.uid;
        const result = await db.deleteUser(uid);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Kullanıcının referanslarını getir
app.get('/api/user/:uid/referrals', async (req, res) => {
    try {
        const uid = req.params.uid;
        const referrals = await db.getUserReferrals(uid);
        
        res.json({
            success: true,
            data: referrals,
            count: referrals.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Tüm kullanıcıları getir
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.getAllUsers();
        
        res.json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Top kullanıcıları getir
app.get('/api/users/top', async (req, res) => {
    try {
        const { by = 'balance', limit = 10 } = req.query;
        const topUsers = await db.getTopUsers(by, parseInt(limit));
        
        res.json({
            success: true,
            data: topUsers,
            by: by,
            limit: parseInt(limit)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// İstatistikleri getir
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await db.getDatabaseStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        const stats = await db.getDatabaseStats();
        
        res.json({ 
            status: 'OK', 
            database: {
                totalUsers: stats.totalUsers,
                totalBalance: stats.totalBalance,
                lastUpdate: stats.metadata.lastUpdate
            },
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
});

// Veritabanını resetle
app.post('/api/reset-database', async (req, res) => {
    try {
        const newDatabase = db.createDefaultDatabase();
        await db.saveDatabase(newDatabase);
        
        res.json({
            success: true,
            message: 'Database reset successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Ana sayfa
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Referral & Balance Management System API',
        version: '2.0',
        endpoints: {
            '/api/debug/database': 'Get full database',
            '/api/user/:uid': 'Get user by UID',
            '/api/user/register': 'Register new user',
            '/api/user/:uid/balance': 'Update user balance',
            '/api/user/:uid/name': 'Update user name',
            '/api/user/:uid/referrals': 'Get user referrals',
            '/api/users': 'Get all users',
            '/api/users/top': 'Get top users',
            '/api/stats': 'Get system stats',
            '/health': 'Health check'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('💥 SERVER ERROR:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error: ' + error.message
    });
});

// Sunucuyu başlat
app.listen(PORT, async () => {
    console.log('\n🚀 ==================================');
    console.log('💰 REFERRAL & BALANCE MANAGEMENT SYSTEM');
    console.log('🚀 ==================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📦 JSONBin ID: ${JSONBIN_CONFIG.binId}`);
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log(`🐛 Debug: http://localhost:${PORT}/api/debug/database`);
    console.log('==================================\n');

    // Bağlantı testi
    try {
        const stats = await db.getDatabaseStats();
        console.log(`✅ Database connected: ${stats.totalUsers} users, $${stats.totalBalance.toFixed(2)} total balance`);
    } catch (error) {
        console.log('❌ Database test failed:', error.message);
    }
});
