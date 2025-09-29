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

// JSONBin Helper Class
class JsonBinManager {
    constructor() {
        this.baseURL = JSONBIN_CONFIG.baseURL;
        this.binId = JSONBIN_CONFIG.binId;
        this.masterKey = JSONBIN_CONFIG.masterKey;
    }

    async getData() {
        try {
            const response = await axios.get(`${this.baseURL}/${this.binId}/latest`, {
                headers: { 'X-Master-Key': this.masterKey }
            });
            return response.data.record || { users: [] };
        } catch (error) {
            console.error('JSONBin get error:', error.message);
            return { users: [] };
        }
    }

    async saveData(data) {
        try {
            const response = await axios.put(`${this.baseURL}/${this.binId}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': this.masterKey
                }
            });
            return response.data;
        } catch (error) {
            console.error('JSONBin save error:', error.message);
            throw error;
        }
    }

    async getUser(userId) {
        const data = await this.getData();
        return data.users.find(user => user.id === userId) || null;
    }

    async createUser(userData) {
        const data = await this.getData();
        data.users.push(userData);
        await this.saveData(data);
        return userData;
    }

    async updateUser(userId, updates) {
        const data = await this.getData();
        const userIndex = data.users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
            data.users[userIndex] = { ...data.users[userIndex], ...updates };
            await this.saveData(data);
            return data.users[userIndex];
        }
        return null;
    }

    async addReferral(referrerId, referredUserId) {
        const data = await this.getData();
        const referrerIndex = data.users.findIndex(user => user.id === referrerId);
        
        if (referrerIndex !== -1) {
            const referrer = data.users[referrerIndex];
            
            // Add referral to referrer's list
            if (!referrer.referrals) referrer.referrals = [];
            if (!referrer.referrals.includes(referredUserId)) {
                referrer.referrals.push(referredUserId);
                referrer.refs_count = (referrer.refs_count || 0) + 1;
                referrer.points += parseFloat(process.env.REFERRAL_BONUS);
                referrer.referralEarnings = (referrer.referralEarnings || 0) + parseFloat(process.env.REFERRAL_BONUS);
                
                data.users[referrerIndex] = referrer;
                await this.saveData(data);
                return true;
            }
        }
        return false;
    }
}

const jsonBin = new JsonBinManager();

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get user data
app.get('/api/user/:userId', async (req, res) => {
    try {
        const user = await jsonBin.getUser(req.params.userId);
        
        if (user) {
            res.json({
                success: true,
                data: user
            });
        } else {
            // Create new user if doesn't exist
            const newUser = {
                id: req.params.userId,
                username: `user_${req.params.userId.substring(0, 8)}`,
                points: 0,
                dailyAdWatchCount: 0,
                lastAdWatchDate: new Date().toISOString().slice(0, 10),
                referrals: [],
                referralEarnings: 0,
                hasJoinedChannel: false,
                hasJoinedGroup: false,
                hasReceivedReferralBonus: false,
                refs_count: 0,
                referred_by: null,
                createdAt: new Date().toISOString()
            };
            
            await jsonBin.createUser(newUser);
            
            res.json({
                success: true,
                data: newUser,
                isNew: true
            });
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user data'
        });
    }
});

// Update user data
app.post('/api/user/:userId', async (req, res) => {
    try {
        const updatedUser = await jsonBin.updateUser(req.params.userId, req.body);
        
        if (updatedUser) {
            res.json({
                success: true,
                data: updatedUser,
                message: 'User data updated successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user data'
        });
    }
});

// Apply referral bonus
app.post('/api/user/:userId/apply-referral', async (req, res) => {
    try {
        const { referrerId } = req.body;
        const userId = req.params.userId;

        // Check if already received referral bonus
        const user = await jsonBin.getUser(userId);
        if (user.hasReceivedReferralBonus) {
            return res.json({
                success: false,
                error: 'Referral bonus already received'
            });
        }

        // Check self-referral
        if (referrerId === userId) {
            return res.json({
                success: false,
                error: 'Self-referral not allowed'
            });
        }

        // Check if referrer exists
        const referrer = await jsonBin.getUser(referrerId);
        if (!referrer) {
            return res.json({
                success: false,
                error: 'Referrer not found'
            });
        }

        // Apply bonus to user
        await jsonBin.updateUser(userId, {
            points: user.points + parseFloat(process.env.REFERRAL_BONUS),
            hasReceivedReferralBonus: true,
            referred_by: referrerId
        });

        // Add bonus to referrer
        await jsonBin.addReferral(referrerId, userId);

        res.json({
            success: true,
            message: 'Referral bonus applied successfully',
            bonus: parseFloat(process.env.REFERRAL_BONUS)
        });

    } catch (error) {
        console.error('Error applying referral:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to apply referral bonus'
        });
    }
});

// Add points to user
app.post('/api/user/:userId/add-points', async (req, res) => {
    try {
        const { points, type } = req.body;
        const user = await jsonBin.getUser(req.params.userId);
        
        if (user) {
            const updates = { points: user.points + points };
            
            // Handle daily ad count
            if (type === 'ad_watch') {
                const today = new Date().toISOString().slice(0, 10);
                if (user.lastAdWatchDate !== today) {
                    updates.dailyAdWatchCount = 1;
                    updates.lastAdWatchDate = today;
                } else {
                    updates.dailyAdWatchCount = (user.dailyAdWatchCount || 0) + 1;
                }
            }
            
            const updatedUser = await jsonBin.updateUser(req.params.userId, updates);
            
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
        console.error('Error adding points:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add points'
        });
    }
});

// Handle withdrawal requests
app.post('/api/withdraw', async (req, res) => {
    try {
        const withdrawData = req.body;
        
        // Send to Pipedream webhook
        await axios.post(process.env.PIPEDREAM_WEBHOOK || 'https://eo3h4zf914hhqv7.m.pipedream.net', withdrawData);
        
        // Deduct points from user
        const user = await jsonBin.getUser(withdrawData.userId);
        if (user) {
            await jsonBin.updateUser(withdrawData.userId, {
                points: user.points - withdrawData.amountUSD
            });
        }
        
        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully'
        });
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process withdrawal request'
        });
    }
});

// Get TON price
app.get('/api/ton-price', async (req, res) => {
    try {
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd'
        );
        
        res.json({
            success: true,
            price: response.data['the-open-network'].usd
        });
    } catch (error) {
        console.error('Error fetching TON price:', error);
        // Fallback price
        res.json({
            success: true,
            price: 2.50
        });
    }
});

// Get all users (for admin)
app.get('/api/admin/users', async (req, res) => {
    try {
        const data = await jsonBin.getData();
        res.json({
            success: true,
            data: data.users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Torre Earn App API - Fixed Version'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Torre Earn App server running on port ${PORT}`);
    console.log(`📊 JSONBin Bin ID: ${JSONBIN_CONFIG.binId}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
