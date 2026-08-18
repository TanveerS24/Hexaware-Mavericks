const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  createComplaint,
  getComplaints,
  getComplaint,
  assignComplaint,
  updateComplaint,
  transcribeAudio,
  preClassify,
} = require('../controllers/complaintController');

// Multer config for audio + images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const imageStorage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm', 'audio/ogg', 
                     'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  },
});

const uploadFields = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../uploads/temp');
      require('fs').mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'images', maxCount: 5 },
]);

router.get('/', authMiddleware, getComplaints);
router.post('/', authMiddleware, requireRole('citizen'), uploadFields, createComplaint);
router.get('/:id', authMiddleware, getComplaint);
router.post('/:id/assign', authMiddleware, requireRole('officer'), assignComplaint);
router.post('/:id/update', authMiddleware, requireRole('officer', 'admin'), updateComplaint);
router.post('/transcribe', authMiddleware, upload.single('audio'), transcribeAudio);
router.post('/classify', authMiddleware, preClassify);

module.exports = router;
