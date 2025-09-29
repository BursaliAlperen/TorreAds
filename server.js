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
    masterKey: process.env.JSONBIN_MASTER_KEY || '$2a$10$t0i.TuifzioNY0cd8HzoDOxB94YLcVc.gbHkv.qmFQzFJcbl9uVrK',
    binId: process.env.JSONBIN_BIN_ID || '68da76fad0ea881f408f1248'
};

// Routes

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get user data
app.get('/api/user/:userId', async (req, res) => {
    try {
        const response = await axios.get(
            `${JSONBIN_CONFIG.baseURL}/${JSONBIN_CONFIG.binId}/latest`,
            {
                headers: {
                    'X-Master-Key': JSONBIN_CONFIG.masterKey
                }
            }
        );
        
        const userData = response.data.record[req.params.userId] || {
            points: 0,
            dailyAdWatchCount: 0,
            lastAdWatchDate: null,
            referrals: [],
            hasJoinedChannel: false,
            hasJoinedGroup: false,
            userId: req.params.userId
        };
        
        res.json({
            success: true,
            data: userData
        });
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
        // First get current data
        const getResponse = await axios.get(
            `${JSONBIN_CONFIG.baseURL}/${JSONBIN_CONFIG.binId}/latest`,
            {
                headers: {
                    'X-Master-Key': JSONBIN_CONFIG.masterKey
                }
            }
        );
        
        let allData = getResponse.data.record || {};
        allData[req.params.userId] = req.body;
        
        // Save updated data
        const putResponse = await axios.put(
            `${JSONBIN_CONFIG.baseURL}/${JSONBIN_CONFIG.binId}`,
            allData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_CONFIG.masterKey
                }
            }
        );
        
        res.json({
            success: true,
            message: 'User data updated successfully'
        });
    } catch (error) {
        console.error('Error updating user data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user data'
        });
    }
});

// Handle withdrawal requests
app.post('/api/withdraw', async (req, res) => {
    try {
        const withdrawData = req.body;
        
        // Send to Pipedream webhook
        await axios.post('https://eo3h4zf914hhqv7.m.pipedream.net', withdrawData);
        
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
        res.status(500).json({
            success: false,
            error: 'Failed to fetch TON price'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Torre Earn App API'
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
