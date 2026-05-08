
const { register } = require('./src/controllers/authController');

const req = {
    body: {
        email: 'test@example.com',
        password: 'Password123',
        fullName: 'Test User',
        userType: 'CLIENT',
        phone: '0912345678'
    }
};

const res = {
    status: function(code) {
        console.log('Status:', code);
        return this;
    },
    json: function(data) {
        console.log('JSON:', data);
        return this;
    }
};

const next = (err) => {
    if (err) {
        console.error('Next called with error:', err);
    } else {
        console.log('Next called');
    }
};

console.log('Testing register handler...');
try {
    register(req, res, next);
} catch (err) {
    console.error('Caught error:', err);
}
