const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

class TorreAdsBackend {
    constructor() {
        this.app = express();
        this.initDatabase();
        this.initMiddleware();
        this.initRoutes();
    }

    initDatabase() {
        mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/torreads', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        mongoose.connection.on('connected', () => {
            console.log('✅ MongoDB bağlantısı başarılı');
        });
        
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB bağlantı hatası:', err);
        });
    }

    initMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(express.json());
        
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100
        });
        this.app.use(limiter);
    }

    initRoutes() {
        this.app.use('/api/auth', require('./routes/auth'));
        this.app.use('/api/ads', require('./routes/ads'));
        this.app.use('/api/user', require('./routes/user'));
        this.app.use('/api/referral', require('./routes/referral'));
        this.app.use('/api/wallet', require('./routes/wallet'));
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'OK', timestamp: new Date() });
        });
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`🚀 TorreAds backend ${port} portunda çalışıyor`);
        });
    }
}

module.exports = TorreAdsBackend;
