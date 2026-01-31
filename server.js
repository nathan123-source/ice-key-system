const http = require('http');
const fs = require('fs');
const url = require('url');
const crypto = require('crypto');
const path = require('path');

const PORT = process.env.PORT || 3000;
const KEYS_FILE = path.join(__dirname, 'data', 'keys.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const SERVICES_FILE = path.join(__dirname, 'data', 'services.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

function loadFile(filename, defaultData) {
    try {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            return JSON.parse(data);
        } else {
            const dir = path.dirname(filename);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filename, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }
    } catch (error) {
        console.error(`Erro ao carregar ${filename}:`, error);
        return defaultData;
    }
}

function saveFile(filename, data) {
    try {
        const dir = path.dirname(filename);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Erro ao salvar ${filename}:`, error);
        return false;
    }
}

let keys = loadFile(KEYS_FILE, []);
let users = loadFile(USERS_FILE, []);
let services = loadFile(SERVICES_FILE, []);

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function getUserByToken(token) {
    if (!token) return null;
    return users.find(u => u.token === token);
}

// Rate limiting simple
const rateLimiter = new Map();
function checkRateLimit(ip, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimiter.has(ip)) {
        rateLimiter.set(ip, []);
    }
    
    const requests = rateLimiter.get(ip);
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
        return false;
    }
    
    validRequests.push(now);
    rateLimiter.set(ip, validRequests);
    return true;
}

const server = http.createServer((req, res) => {
    // CORS headers mais robustos
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://netlify.app',
        'https://vercel.app',
        'https://render.com'
    ];
    
    if (origin && (allowedOrigins.some(allowed => origin.includes(allowed)) || origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Rate limiting
    const clientIP = req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Muitas tentativas. Tente novamente em 1 minuto.' }));
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname} - IP: ${clientIP}`);
    
    if (pathname === '/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                console.log('📝 Tentativa de registro - Body recebido:', body);
                
                const payload = JSON.parse(body || '{}');
                const username = (payload.username || '').toString().trim();
                const password = (payload.password || '').toString();
                const email = (payload.email || '').toString().trim();

                console.log('📝 Dados do registro:', { username, email, passwordLength: password.length });

                if (!username || !password || !email) {
                    console.log('❌ Campos faltando');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Campos faltando: username, email e password são obrigatórios.' }));
                    return;
                }

                if (username.length < 3) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Username deve ter pelo menos 3 caracteres.' }));
                    return;
                }

                if (password.length < 4) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Senha deve ter pelo menos 4 caracteres.' }));
                    return;
                }

                if (!email.includes('@')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Email inválido.' }));
                    return;
                }

                if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
                    console.log('❌ Usuário já existe:', username);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Usuário já existe!' }));
                    return;
                }

                if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
                    console.log('❌ Email já existe:', email);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Email já está em uso!' }));
                    return;
                }

                const newUser = {
                    id: Date.now().toString(),
                    username,
                    email,
                    password: hashPassword(password),
                    token: generateToken(),
                    createdAt: new Date().toISOString()
                };
                
                users.push(newUser);
                const saved = saveFile(USERS_FILE, users);
                
                if (!saved) {
                    console.log('❌ Erro ao salvar usuário');
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Erro interno do servidor ao salvar usuário.' }));
                    return;
                }
                
                console.log(`✅ Novo usuário criado: ${username}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    token: newUser.token,
                    username: newUser.username,
                    userId: newUser.id,
                    message: 'Conta criada com sucesso!'
                }));
            } catch (error) {
                console.error('❌ Erro no registro:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Erro interno do servidor: ' + error.message }));
            }
        });
        return;
    }
    
    if (pathname === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                console.log('🔐 Tentativa de login - Body recebido:', body);
                
                const payload = JSON.parse(body || '{}');
                const username = (payload.username || '').toString().trim();
                const password = (payload.password || '').toString();

                console.log('🔐 Dados do login:', { username, passwordLength: password.length });

                if (!username || !password) {
                    console.log('❌ Campos faltando no login');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Campos faltando: username e password são obrigatórios.' }));
                    return;
                }

                const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
                console.log('🔍 Usuário encontrado:', !!user);

                if (!user) {
                    console.log('❌ Usuário não encontrado:', username);
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Usuário não encontrado!' }));
                    return;
                }

                const hashedPassword = hashPassword(password);
                console.log('🔐 Verificando senha...');

                if (user.password !== hashedPassword) {
                    console.log('❌ Senha incorreta para:', username);
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Senha incorreta!' }));
                    return;
                }

                // Gerar novo token a cada login
                user.token = generateToken();
                user.lastLogin = new Date().toISOString();
                
                const saved = saveFile(USERS_FILE, users);
                if (!saved) {
                    console.log('❌ Erro ao salvar token do usuário');
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Erro interno do servidor.' }));
                    return;
                }

                console.log(`✅ Login bem-sucedido: ${username}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    token: user.token,
                    username: user.username,
                    userId: user.id,
                    message: 'Login realizado com sucesso!'
                }));
            } catch (error) {
                console.error('❌ Erro no login:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Erro interno do servidor: ' + error.message }));
            }
        });
        return;
    }
    
    if (pathname === '/verify-token' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const token = (payload.token || '').toString();
                const user = getUserByToken(token);

                if (user) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        username: user.username,
                        userId: user.id
                    }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Token inválido' }));
                }
            } catch (error) {
                console.error('verify-token error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Erro ao verificar token', error: error.message }));
            }
        });
        return;
    }
    
    if (pathname === '/verify' && req.method === 'GET') {
        const keyCode = parsedUrl.query.key;
        const hwid = parsedUrl.query.hwid;
        const token = parsedUrl.query.token;
        const serviceId = parsedUrl.query.serviceId;

        // Log basic request info for debugging (mask token)
        const maskedToken = token ? (token.slice(0,6) + '...' + token.slice(-6)) : null;
        console.log(`🔍 /verify req - url=${req.url} | key=${keyCode} | hwid=${hwid} | token=${maskedToken} | serviceId=${serviceId}`);
        // Also log a few headers that may help diagnosing hosting/proxy issues
        console.log('headers:', {
            host: req.headers.host,
            'user-agent': req.headers['user-agent'],
            accept: req.headers.accept
        });

        if (!keyCode || !hwid || !token || !serviceId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false, message: 'Parâmetros faltando' }));
            return;
        }

        const user = getUserByToken(token);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false, message: 'Token inválido' }));
            return;
        }

        const key = keys.find(k => k.code === keyCode);

        if (!key) {
            console.log('❌ Key não encontrada');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false, message: '❌ Key inválida!' }));
            return;
        }

        // Ensure the key belongs to the authenticated user
        if (key.ownerId !== user.id) {
            console.log('🚫 Key pertence a outro usuário');
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false, message: '🔒 Esta key não pertence ao usuário autenticado.' }));
            return;
        }

        // Ensure the key is for the requested service
        if (!key.serviceId || key.serviceId !== serviceId) {
            console.log('🚫 Key não pertence ao serviço solicitado');
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false, message: '🔒 Esta key não é válida para este serviço.' }));
            return;
        }

        if (key.expirationDate && new Date() > new Date(key.expirationDate)) {
            console.log('⏰ Key expirada');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: false, message: '⏰ Key expirou!' }));
            return;
        }

        if (!key.hwid) {
            key.hwid = hwid;
            key.firstUsed = new Date().toISOString();
            saveFile(KEYS_FILE, keys);
            console.log('✅ HWID vinculado');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: true, message: '✅ Key validada!' }));
            return;
        }

        if (key.hwid === hwid) {
            console.log('✅ Key válida');
            key.lastUsed = new Date().toISOString();
            saveFile(KEYS_FILE, keys);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ valid: true, message: '✅ Key validada!' }));
            return;
        } else {
            console.log('🔒 HWID diferente');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                valid: false, 
                message: 'Essa key já está sendo usada',
                reason: 'hwid_mismatch'
            }));
            return;
        }
    }
    
    if (pathname === '/keys' && req.method === 'GET') {
        const token = parsedUrl.query.token;
        const user = getUserByToken(token);

        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false }));
            return;
        }

        const serviceId = parsedUrl.query.serviceId;

        const userKeys = keys.filter(k => k.ownerId === user.id && (!serviceId || k.serviceId === serviceId));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(userKeys));
        return;
    }
    
    if (pathname === '/addkey' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const user = getUserByToken(data.token);
                
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Token inválido' }));
                    return;
                }

                if (!data.code || !data.name) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Código e nome da key são obrigatórios' }));
                    return;
                }

                // Verificar se key já existe
                if (keys.find(k => k.code === data.code)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Key com este código já existe' }));
                    return;
                }
                
                const newKey = {
                    code: data.code,
                    name: data.name,
                    serviceId: data.serviceId || null,
                    ownerId: user.id,
                    ownerUsername: user.username,
                    hwid: null,
                    expirationDate: data.expirationDate,
                    createdAt: new Date().toISOString(),
                    firstUsed: null,
                    lastUsed: null
                };
                
                keys.push(newKey);
                const saved = saveFile(KEYS_FILE, keys);
                
                if (!saved) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Erro ao salvar key no servidor' }));
                    return;
                }
                
                console.log(`✅ Key criada: ${newKey.code} por ${user.username}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, key: newKey, message: 'Key criada com sucesso!' }));
            } catch (error) {
                console.error('Erro ao criar key:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Erro interno do servidor: ' + error.message }));
            }
        });
        return;
    }
    
    if (pathname === '/deletekey' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const user = getUserByToken(data.token);
                
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                    return;
                }
                
                const index = keys.findIndex(k => k.code === data.code && k.ownerId === user.id);
                
                if (index !== -1) {
                    keys.splice(index, 1);
                    saveFile(KEYS_FILE, keys);
                    console.log(`🗑️ Key deletada: ${data.code}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }
    
    if (pathname === '/reset-hwid' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const user = getUserByToken(data.token);
                
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                    return;
                }
                
                const key = keys.find(k => k.code === data.code && k.ownerId === user.id);
                
                if (key) {
                    key.hwid = null;
                    saveFile(KEYS_FILE, keys);
                    console.log(`🔄 HWID resetado: ${data.code}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    // Services endpoints
    if (pathname === '/services' && req.method === 'GET') {
        const token = parsedUrl.query.token;
        const user = getUserByToken(token);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false }));
            return;
        }

        const userServices = services.filter(s => s.ownerId === user.id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(userServices));
        return;
    }

    if (pathname === '/addservice' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const user = getUserByToken(data.token);
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                    return;
                }

                const newService = {
                    id: Date.now().toString(),
                    name: data.name,
                    ownerId: user.id,
                    ownerUsername: user.username,
                    createdAt: new Date().toISOString()
                };

                services.push(newService);
                saveFile(SERVICES_FILE, services);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, service: newService }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    if (pathname === '/deleteservice' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const user = getUserByToken(data.token);
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                    return;
                }

                const index = services.findIndex(s => s.id === data.serviceId && s.ownerId === user.id);
                if (index !== -1) {
                    // remove service
                    services.splice(index, 1);
                    // remove keys for this service
                    keys = keys.filter(k => k.serviceId !== data.serviceId);
                    saveFile(SERVICES_FILE, services);
                    saveFile(KEYS_FILE, keys);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }
    
    if (pathname === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'online' }));
        return;
    }

    if (pathname === '/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', users: users.length, keys: keys.length, services: services.length }));
        return;
    }
    
    if (pathname === '/' || pathname === '/index.html') {
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404</h1>');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }
    
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '404' }));
});

server.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   🔐 SERVIDOR INICIADO! 🔐            ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  🌐 http://localhost:${PORT}              ║`);
    console.log(`║  👥 Usuários: ${users.length}                       ║`);
    console.log(`║  🔑 Keys: ${keys.length}                           ║`);
    console.log('╚════════════════════════════════════════╝\n');
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} em uso!`);
    }
    process.exit(1);
});