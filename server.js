const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const TonWeb = require('tonweb');

class TorreAdsBackend {
    constructor() {
        this.app = express();
        this.tonweb = new TonWeb();
        this.initMiddleware();
        this.initRoutes();
        this.initDatabase();
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
        this.app.use('/api/referral', require('./routes/referral'));
        this.app.use('/api/wallet', require('./routes/wallet'));
        this.app.use('/api/admin', require('./routes/admin'));
    }

    initDatabase() {
        // MongoDB bağlantısı
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`🚀 TorreAds backend ${port} portunda çalışıyor`);
        });
    }
}

module.exports = TorreAdsBackend;
