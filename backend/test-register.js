const express = require('express');
const app = require('./src/app');
const mongoose = require('mongoose');

async function testRegistration() {
    // connect to a fake DB or local db
    await mongoose.connect('mongodb://127.0.0.1:27017/aidb_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('Connected to DB');

    const server = app.listen(0, async () => {
        const port = server.address().port;
        console.log('Server started on port', port);

        const http = require('http');
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
            res.on('data', d => { resData += d });
            res.on('end', async () => {
                console.log('STATUS:', res.statusCode);
                console.log('RESPONSE:', resData);
                await mongoose.disconnect();
                server.close();
                process.exit(0);
            });
        });

        req.on('error', console.error);
        req.write(data);
        req.end();
    });
}

testRegistration().catch(err => {
    console.error(err);
    process.exit(1);
});
