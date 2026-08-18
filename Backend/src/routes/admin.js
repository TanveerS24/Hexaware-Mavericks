const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { 
  listOfficers, 
  approveOfficer, 
  rejectOfficer, 
  getAnalytics, 
  getDuplicates, 
  unbanCitizen, 
  getAllComplaints, 
  listUsers,
  listAnnouncements,
  createAnnouncement
} = require('../controllers/adminController');

router.use(authMiddleware, requireRole('admin'));

router.get('/officers', listOfficers);
router.post('/officers/:id/approve', approveOfficer);
router.post('/officers/:id/reject', rejectOfficer);
router.get('/analytics', getAnalytics);
router.get('/duplicates', getDuplicates);
router.get('/complaints', getAllComplaints);
router.get('/users', listUsers);
router.get('/announcements', listAnnouncements);
router.post('/announcements', createAnnouncement);
router.get('/broadcasts', listAnnouncements);
router.post('/broadcasts', createAnnouncement);
router.post('/citizens/:id/unban', unbanCitizen);

module.exports = router;


