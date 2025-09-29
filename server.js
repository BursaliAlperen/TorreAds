const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// JSONBin Configuration - YENİ BIN ID
const JSONBIN_CONFIG = {
    baseURL: 'https://api.jsonbin.io/v3/b',
    masterKey: process.env.JSONBIN_MASTER_KEY,
    binId: "68dae2c8ae596e708f005011" // YENİ BIN ID
};

console.log('🚀 Starting with NEW JSONBin ID:', JSONBIN_CONFIG.binId);

// ULTIMATE JSONBin MANAGER
class UltimateJsonBinManager {
    constructor() {
        this.baseURL = JSONBIN_CONFIG.baseURL;
        this.binId = JSONBIN_CONFIG.binId;
        this.masterKey = JSONBIN_CONFIG.masterKey;
        this.cache = null;
        this.lastFetch = 0;
        this.cacheTimeout = 5000;
    }

    async fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios({
                    url,
                    timeout: 10000,
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': this.masterKey,
                        ...options.headers
                    }
                });
                return response;
            } catch (error) {
                console.log(`Attempt ${i + 1} failed:`, error.message);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    async getDatabase() {
        if (this.cache && Date.now() - this.lastFetch < this.cacheTimeout) {
            return this.cache;
        }

        try {
            console.log('📥 Fetching database from JSONBin...');
            const response = await this.fetchWithRetry(`${this.baseURL}/${this.binId}/latest`);
            
            let data = response.data.record;
            
            // Eğer bin boşsa veya hatalıysa, yeni structure oluştur
            if (!data || typeof data !== 'object') {
                console.log('🆕 Creating new database structure...');
                data = { 
                    users: {}, 
                    metadata: { 
                        totalUsers: 0, 
                        version: '4.0',
                        createdAt: new Date().toISOString() 
                    } 
                };
                await this.saveDatabase(data);
            }
            
            if (!data.users) data.users = {};
            if (!data.metadata) {
                data.metadata = { 
                    totalUsers: Object.keys(data.users).length, 
                    version: '4.0',
                    createdAt: new Date().toISOString() 
                };
            }
            
            this.cache = data;
            this.lastFetch = Date.now();
            
            console.log(`✅ Database loaded. Users: ${Object.keys(data.users).length}`);
            return data;
        } catch (error) {
            console.error('❌ FATAL: Cannot connect to JSONBin:', error.message);
            return { users: {}, metadata: { totalUsers: 0, version: '4.0', error: 'Connection failed' } };
        }
    }

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
            console.error('❌ FATAL: Cannot save to JSONBin:', error.message);
            throw new Error('DATABASE_SAVE_FAILED: ' + error.message);
        }
    }

    async getUser(userId) {
        const database = await this.getDatabase();
        return database.users[userId] || null;
    }

    async createUser(userId, userData) {
        const database = await this.getDatabase();
        
        if (database.users[userId]) {
            console.log('⚠️ User already exists:', userId);
            return database.users[userId];
        }

        // Yeni kullanıcı oluştur
        database.users[userId] = {
            ...userData,
            id: userId,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        // Metadata güncelle
        database.metadata.totalUsers = Object.keys(database.users).length;
        database.metadata.lastUpdate = new Date().toISOString();

        await this.saveDatabase(database);
        console.log('✅ New user created:', userId);
        return database.users[userId];
    }

    async updateUser(userId, updates) {
        const database = await this.getDatabase();
        
        if (!database.users[userId]) {
            console.log('❌ User not found for update:', userId);
            return null;
        }

        // Kullanıcıyı güncelle
        database.users[userId] = {
            ...database.users[userId],
            ...updates,
            lastUpdated: new Date().toISOString()
        };

        database.metadata.lastUpdate = new Date().toISOString();
        await this.saveDatabase(database);
        
        console.log('✅ User updated:', userId);
        return database.users[userId];
    }

    async applyReferral(userId, referrerId) {
        const database = await this.getDatabase();
        
        // Validasyonlar
        if (!database.users[userId]) throw new Error('User not found');
        if (!database.users[referrerId]) throw new Error('Referrer not found');
        if (userId === referrerId) throw new Error('Self-referral not allowed');
        if (database.users[userId].hasReceivedReferralBonus) throw new Error('Already received referral bonus');
        if (database.users[userId].referred_by) throw new Error('Already referred by someone');

        console.log(`🎯 Applying referral: ${referrerId} -> ${userId}`);

        // Referans alan kullanıcıyı güncelle
        database.users[userId].points = (database.users[userId].points || 0) + 0.02;
        database.users[userId].hasReceivedReferralBonus = true;
        database.users[userId].referred_by = referrerId;

        // Referans veren kullanıcıyı güncelle
        if (!database.users[referrerId].referrals) {
            database.users[referrerId].referrals = [];
        }
        if (!database.users[referrerId].referrals.includes(userId)) {
            database.users[referrerId].referrals.push(userId);
        }
        database.users[referrerId].points = (database.users[referrerId].points || 0) + 0.02;
        database.users[referrerId].refs_count = (database.users[referrerId].refs_count || 0) + 1;
        database.users[referrerId].referralEarnings = (database.users[referrerId].referralEarnings || 0) + 0.02;

        database.metadata.lastUpdate = new Date().toISOString();
        await this.saveDatabase(database);

        console.log('✅ Referral applied successfully');
        return true;
    }

    async debugDatabase() {
        const database = await this.getDatabase();
        return {
            totalUsers: Object.keys(database.users).length,
            users: database.users,
            metadata: database.metadata
        };
    }
}

const db = new UltimateJsonBinManager();

// ROUTES

// Debug endpoint
app.get('/api/debug/database', async (req, res) => {
    try {
        const debugInfo = await db.debugDatabase();
        res.json({
            success: true,
            ...debugInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get or create user
app.get('/api/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log('\n=== GET USER ===', userId);

        let user = await db.getUser(userId);
        
        if (user) {
            console.log('✅ Existing user returned');
            res.json({
                success: true,
                data: user
            });
        } else {
            console.log('🆕 Creating new user');
            const newUser = {
                id: userId,
                username: `user_${userId.substring(0, 8)}`,
                points: 0,
                dailyAdWatchCount: 0,
                lastAdWatchDate: new Date().toISOString().split('T')[0],
                referrals: [],
                referralEarnings: 0,
                hasJoinedChannel: false,
                hasJoinedGroup: false,
                hasReceivedReferralBonus: false,
                refs_count: 0,
                referred_by: null
            };

            const createdUser = await db.createUser(userId, newUser);
            
            res.json({
                success: true,
                data: createdUser,
                isNew: true
            });
        }
    } catch (error) {
        console.error('❌ GET USER ERROR:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Apply referral
app.post('/api/user/:userId/apply-referral', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { referrerId } = req.body;

        console.log('\n=== APPLY REFERRAL ===', { userId, referrerId });

        if (!referrerId) {
            return res.json({
                success: false,
                error: 'Referrer ID required'
            });
        }

        await db.applyReferral(userId, referrerId);
        
        res.json({
            success: true,
            message: 'Referral bonus applied successfully',
            bonus: 0.02
        });

    } catch (error) {
        console.error('❌ REFERRAL ERROR:', error.message);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Add points
app.post('/api/user/:userId/add-points', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { points, type } = req.body;

        console.log('\n=== ADD POINTS ===', { userId, points, type });

        const user = await db.getUser(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const updates = {
            points: (user.points || 0) + points
        };

        if (type === 'ad_watch') {
            const today = new Date().toISOString().split('T')[0];
            if (user.lastAdWatchDate !== today) {
                updates.dailyAdWatchCount = 1;
                updates.lastAdWatchDate = today;
            } else {
                updates.dailyAdWatchCount = (user.dailyAdWatchCount || 0) + 1;
            }
        }

        const updatedUser = await db.updateUser(userId, updates);
        
        res.json({
            success: true,
            data: updatedUser
        });

    } catch (error) {
        console.error('❌ ADD POINTS ERROR:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update user
app.post('/api/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const updates = req.body;

        console.log('\n=== UPDATE USER ===', { userId, updates });

        const updatedUser = await db.updateUser(userId, updates);
        
        if (updatedUser) {
            res.json({
                success: true,
                data: updatedUser
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
    } catch (error) {
        console.error('❌ UPDATE USER ERROR:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// TON price
app.get('/api/ton-price', async (req, res) => {
    try {
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd',
            { timeout: 5000 }
        );
        
        res.json({
            success: true,
            price: response.data['the-open-network']?.usd || 2.50
        });
    } catch (error) {
        res.json({
            success: true,
            price: 2.50
        });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        const database = await db.getDatabase();
        res.json({ 
            status: 'OK', 
            database: {
                totalUsers: Object.keys(database.users).length,
                lastUpdate: database.metadata.lastUpdate
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
});

// Reset database
app.post('/api/reset-database', async (req, res) => {
    try {
        const newDatabase = {
            users: {},
            metadata: {
                createdAt: new Date().toISOString(),
                totalUsers: 0,
                version: '5.0',
                reset: true
            }
        };
        
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

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('\n🚀 ==================================');
    console.log('💰 TORRE EARN APP - YENİ DATABASE');
    console.log('🚀 ==================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`📦 Yeni JSONBin: ${JSONBIN_CONFIG.binId}`);
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log(`🐛 Debug: http://localhost:${PORT}/api/debug/database`);
    console.log('==================================\n');

    // Test connection
    try {
        const database = await db.getDatabase();
        console.log(`✅ Yeni database bağlantısı: ${Object.keys(database.users).length} kullanıcı`);
    } catch (error) {
        console.log('❌ Database test failed:', error.message);
    }
});
