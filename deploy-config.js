// Configuração para diferentes ambientes de deploy
const config = {
    development: {
        API_URL: 'http://localhost:3000',
        CORS_ORIGINS: ['http://localhost:3000', 'http://127.0.0.1:3000']
    },
    production: {
        API_URL: process.env.API_URL || 'https://seu-app.onrender.com',
        CORS_ORIGINS: [
            'https://netlify.app',
            'https://vercel.app', 
            'https://render.com',
            'https://railway.app'
        ]
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];