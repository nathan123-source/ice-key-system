// Script de teste para verificar se o servidor está funcionando
const http = require('http');

const API_URL = 'http://localhost:3000';

async function testEndpoint(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Iniciando testes do servidor...\n');

    try {
        // Teste 1: Ping
        console.log('1. Testando /ping...');
        const pingResult = await testEndpoint('/ping');
        console.log(`   Status: ${pingResult.status}`);
        console.log(`   Resposta: ${JSON.stringify(pingResult.data)}\n`);

        // Teste 2: Status
        console.log('2. Testando /status...');
        const statusResult = await testEndpoint('/status');
        console.log(`   Status: ${statusResult.status}`);
        console.log(`   Resposta: ${JSON.stringify(statusResult.data)}\n`);

        // Teste 3: Registro
        console.log('3. Testando registro...');
        const testUser = {
            username: 'teste_' + Date.now(),
            email: 'teste@teste.com',
            password: 'senha123'
        };
        const registerResult = await testEndpoint('/register', 'POST', testUser);
        console.log(`   Status: ${registerResult.status}`);
        console.log(`   Resposta: ${JSON.stringify(registerResult.data)}\n`);

        if (registerResult.data.success) {
            const token = registerResult.data.token;
            
            // Teste 4: Verificar token
            console.log('4. Testando verificação de token...');
            const verifyResult = await testEndpoint('/verify-token', 'POST', { token });
            console.log(`   Status: ${verifyResult.status}`);
            console.log(`   Resposta: ${JSON.stringify(verifyResult.data)}\n`);

            // Teste 5: Criar serviço
            console.log('5. Testando criação de serviço...');
            const serviceResult = await testEndpoint('/addservice', 'POST', {
                name: 'Serviço Teste',
                token: token
            });
            console.log(`   Status: ${serviceResult.status}`);
            console.log(`   Resposta: ${JSON.stringify(serviceResult.data)}\n`);

            if (serviceResult.data.success) {
                const serviceId = serviceResult.data.service.id;

                // Teste 6: Criar key
                console.log('6. Testando criação de key...');
                const keyResult = await testEndpoint('/addkey', 'POST', {
                    code: 'TEST-1234-5678-9ABC',
                    name: 'Key Teste',
                    serviceId: serviceId,
                    token: token,
                    expirationDate: null
                });
                console.log(`   Status: ${keyResult.status}`);
                console.log(`   Resposta: ${JSON.stringify(keyResult.data)}\n`);
            }
        }

        console.log('✅ Testes concluídos!');

    } catch (error) {
        console.error('❌ Erro durante os testes:', error);
    }
}

// Verificar se o servidor está rodando
console.log('🔍 Verificando se o servidor está rodando na porta 3000...');
const testReq = http.request({ hostname: 'localhost', port: 3000, path: '/ping' }, (res) => {
    console.log('✅ Servidor encontrado! Iniciando testes...\n');
    runTests();
});

testReq.on('error', (e) => {
    console.log('❌ Servidor não está rodando na porta 3000!');
    console.log('   Execute "npm start" primeiro.\n');
});

testReq.end();