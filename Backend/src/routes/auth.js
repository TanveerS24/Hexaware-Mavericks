const express = require('express');
const router = express.Router();
const { registerCitizen, registerOfficer, login, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register/citizen', registerCitizen);
router.post('/register/officer', registerOfficer);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

module.exports = router;
