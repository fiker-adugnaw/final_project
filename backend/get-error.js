const fs = require('fs');
const util = require('util');

const origError = console.error;
const logStream = fs.createWriteStream('./stderr.log');
console.error = function(...args) {
    origError.apply(console, args);
    logStream.write(util.format(...args) + '\n');
};

process.on('uncaughtException', err => {
    fs.writeFileSync('error_log.txt', String(err.stack));
    process.exit(1);
});
process.on('unhandledRejection', err => {
    fs.writeFileSync('error_log.txt', String(err.stack));
    process.exit(1);
});

async function run() {
    process.env.NODE_ENV = 'development'; // FORCE DEV MODE
    try {
        const app = require('./src/app');
        const http = require('http');

        const server = app.listen(0, () => {
            const port = server.address().port;
            const data = JSON.stringify({
                fullName: 'Test User',
                email: 'test@example.com',
                phone: '0911223344',
                password: 'Password123!',
                confirmPassword: 'Password123!',
                userType: 'CLIENT'
            });

            const req = http.request({
                hostname: '127.0.0.1',
                port: port,
                path: '/api/v1/auth/register',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, (res) => {
                let resData = '';
                res.on('data', d => { resData += d; });
                res.on('end', () => {
                    fs.writeFileSync('error_log.txt', `STATUS: ${res.statusCode}\nBODY: ${resData}`);
                    process.exit(0);
                });
            });

            req.on('error', err => {
                fs.writeFileSync('error_log.txt', String(err.stack));
                process.exit(1);
            });
            req.write(data);
            req.end();
        });
    } catch (e) {
        fs.writeFileSync('error_log.txt', String(e.stack));
        process.exit(1);
    }
}

run();
